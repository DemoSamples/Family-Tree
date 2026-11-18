import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Function Declarations for Gemini Tool Calling
const addMemberTool: FunctionDeclaration = {
  name: 'add_member',
  description: 'Add a new family member to the genealogical database with vitals and relationships.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      firstName: { type: Type.STRING, description: 'Given / first name' },
      lastName: { type: Type.STRING, description: 'Family / last name' },
      gender: { type: Type.STRING, description: 'male, female, non-binary, or other' },
      birthYear: { type: Type.NUMBER, description: 'Four-digit birth year' },
      birthPlace: { type: Type.STRING, description: 'Birth city, state, or country' },
      isLiving: { type: Type.BOOLEAN, description: 'True if living, false if deceased' },
      deathYear: { type: Type.NUMBER, description: 'Death year if deceased' },
      occupation: { type: Type.STRING, description: 'Career or profession' },
      bio: { type: Type.STRING, description: 'Biographical summary' },
      parentIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array of member IDs who are parents of this person',
      },
      spouseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array of member IDs who are spouses/partners of this person',
      },
    },
    required: ['firstName', 'lastName', 'birthYear'],
  },
};

const editMemberTool: FunctionDeclaration = {
  name: 'edit_member',
  description: 'Update biographical details, vitals, occupation, or notes for an existing family member.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      memberId: { type: Type.STRING, description: 'The unique ID of the member to edit' },
      firstName: { type: Type.STRING, description: 'Updated first name' },
      lastName: { type: Type.STRING, description: 'Updated last name' },
      occupation: { type: Type.STRING, description: 'Updated occupation' },
      bio: { type: Type.STRING, description: 'Updated biography' },
      birthYear: { type: Type.NUMBER, description: 'Updated birth year' },
      deathYear: { type: Type.NUMBER, description: 'Updated death year' },
      isLiving: { type: Type.BOOLEAN, description: 'Updated living status' },
    },
    required: ['memberId'],
  },
};

const linkRelationshipTool: FunctionDeclaration = {
  name: 'link_relationship',
  description: 'Connect two existing members with a relationship (parent-child or spouse).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      personAId: { type: Type.STRING, description: 'First person ID' },
      personBId: { type: Type.STRING, description: 'Second person ID' },
      relationType: {
        type: Type.STRING,
        description: 'parent_of (personA is parent of personB) or spouse_of',
      },
    },
    required: ['personAId', 'personBId', 'relationType'],
  },
};

const createCanvasWorkspaceTool: FunctionDeclaration = {
  name: 'create_canvas_workspace',
  description: 'Create a new dedicated canvas workspace focused on a specific person and their generations or lineage branch.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the workspace' },
      focalPersonId: { type: Type.STRING, description: 'The focal person ID whose lineage is shown' },
      description: { type: Type.STRING, description: 'Purpose or context of this workspace' },
    },
    required: ['title', 'focalPersonId'],
  },
};

const addLifeEventTool: FunctionDeclaration = {
  name: 'add_life_event',
  description: 'Record a historical milestone or life event for a family member.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      memberId: { type: Type.STRING, description: 'The member ID' },
      year: { type: Type.NUMBER, description: 'Year event took place' },
      title: { type: Type.STRING, description: 'Title of milestone' },
      description: { type: Type.STRING, description: 'Historical contextual description' },
      category: { type: Type.STRING, description: 'birth, marriage, education, military, migration, award, other' },
      location: { type: Type.STRING, description: 'City/Place where event occurred' },
    },
    required: ['memberId', 'year', 'title'],
  },
};

const highlightLineageTool: FunctionDeclaration = {
  name: 'highlight_lineage',
  description: 'Focus the graph canvas by highlighting direct ancestors and descendants for a specific person.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      memberId: { type: Type.STRING, description: 'The member ID to focus and highlight' },
    },
    required: ['memberId'],
  },
};

const deleteMemberTool: FunctionDeclaration = {
  name: 'delete_member',
  description: 'Remove a person from the family tree and disconnect their kinship relations.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      memberId: { type: Type.STRING, description: 'The unique ID of the member to delete' },
    },
    required: ['memberId'],
  },
};

const clearAllRecordsTool: FunctionDeclaration = {
  name: 'clear_all_records',
  description: 'Delete all records from the family tree and reset to a blank fresh canvas.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// POST /api/chat: RAG + Action execution API
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, ragContext, memberList, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemInstruction = `
You are the Kinship Archive AI Genealogist & Knowledge Graph Assistant.
You assist family historians, researchers, and users in navigating, querying, and updating the genealogical knowledge graph.

Your capabilities:
1. Answer questions about ancestors, migrations, professions, kinship lineages, and historical milestones using the provided Knowledge Graph RAG context.
2. Execute specific database actions whenever the user instructs you to:
   - add_member: add a new relative or ancestor
   - edit_member: edit details, bio, occupation, or vitals of an existing person
   - link_relationship: connect two members as parent-child or spouses
   - create_canvas_workspace: create a new custom canvas workspace isolating a specific person and their generations
   - add_life_event: record a historical milestone for someone
   - highlight_lineage: focus the tree canvas on an individual's ancestry and descendants

Current RAG Knowledge Graph Context:
${ragContext || 'No specific RAG context provided.'}

Available Members List Summary:
${JSON.stringify(memberList || [], null, 2)}

Be courteous, precise with dates and genealogical relationships, and always confirm any actions taken. If a user asks a question, cite dates, places, and occupations from the records.
`.trim();

    // If Gemini API Key is available, use @google/genai SDK
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: message,
          config: {
            systemInstruction,
            tools: [
              {
                functionDeclarations: [
                  addMemberTool,
                  editMemberTool,
                  linkRelationshipTool,
                  createCanvasWorkspaceTool,
                  addLifeEventTool,
                  highlightLineageTool,
                  deleteMemberTool,
                  clearAllRecordsTool,
                ],
              },
            ],
          },
        });

        const text = response.text || '';
        const functionCalls = response.functionCalls || [];

        return res.json({
          reply: text,
          actions: functionCalls.map((fc: any) => ({
            name: fc.name,
            args: fc.args,
          })),
        });
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to local reasoning agent:', geminiError?.message);
      }
    }

    // Fallback: Intelligent Local Semantic Agent
    // Resolves queries and parses natural language actions
    const lower = message.toLowerCase();
    const actions: any[] = [];
    let reply = '';

    // Check for "add member" or "add ancestor"
    if (lower.includes('add') && (lower.includes('member') || lower.includes('son') || lower.includes('daughter') || lower.includes('parent') || lower.includes('father') || lower.includes('mother') || lower.includes('child'))) {
      // Extract names
      const nameMatch = message.match(/named?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i) || message.match(/add\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      const yearMatch = message.match(/\b(18\d\d|19\d\d|20\d\d)\b/);
      const firstName = nameMatch ? nameMatch[1].split(' ')[0] : 'New';
      const lastName = nameMatch && nameMatch[1].split(' ').length > 1 ? nameMatch[1].split(' ')[1] : 'Montgomery';
      const birthYear = yearMatch ? parseInt(yearMatch[1], 10) : 1985;

      actions.push({
        name: 'add_member',
        args: {
          firstName,
          lastName,
          birthYear,
          isLiving: birthYear > 1940,
          gender: lower.includes('daughter') || lower.includes('mother') ? 'female' : 'male',
          occupation: 'Family Member',
          bio: `Recorded through AI Genealogist session for ${firstName} ${lastName}.`,
        },
      });
      reply = `I have added **${firstName} ${lastName}** (born circa ${birthYear}) to the genealogical database and synchronized the knowledge graph.`;
    }
    // Check for "create workspace"
    else if (lower.includes('workspace') || lower.includes('canvas')) {
      const match = (memberList || []).find((m: any) =>
        lower.includes(m.firstName.toLowerCase()) || lower.includes(m.name.toLowerCase())
      );
      const focalId = match ? match.id : (memberList?.[0]?.id || 'mem-1');
      const focalName = match ? match.name : 'Ancestral Lineage';

      actions.push({
        name: 'create_canvas_workspace',
        args: {
          title: `${focalName} & Lineage Workspace`,
          focalPersonId: focalId,
          description: `Custom knowledge graph workspace focusing on ${focalName} and surrounding generations.`,
        },
      });
      reply = `I've created a new canvas workspace for **${focalName}** isolating their generational lineage clusters. You can switch to it from the workspace bar!`;
    }
    // Check for "highlight" or "focus"
    else if (lower.includes('highlight') || lower.includes('focus') || lower.includes('show lineage')) {
      const match = (memberList || []).find((m: any) =>
        lower.includes(m.firstName.toLowerCase()) || lower.includes(m.name.toLowerCase())
      );
      if (match) {
        actions.push({
          name: 'highlight_lineage',
          args: { memberId: match.id },
        });
        reply = `Focusing the graph canvas on **${match.name}**. All direct ancestors and descendants are now highlighted, while unrelated connections are dimmed.`;
      } else {
        reply = `I could not identify the specific person in your request. Please specify a name such as "Highlight Charles Montgomery" or "Focus on Arthur".`;
      }
    }
    // Check for "clear canvas" or "delete all records"
    else if (lower.includes('clear canvas') || lower.includes('delete all') || lower.includes('clear all') || lower.includes('blank canvas') || lower.includes('सबै हटाउ') || lower.includes('खाली क्यानभास')) {
      actions.push({
        name: 'clear_all_records',
        args: {},
      });
      reply = 'I have cleared all genealogical records from the database. You now have a fresh, blank canvas to start mapping your family tree.';
    }
    // Check for "delete member" or "remove person"
    else if (lower.includes('delete') || lower.includes('remove') || lower.includes('हटाउनु') || lower.includes('मेटाउनु')) {
      const match = (memberList || []).find((m: any) =>
        lower.includes((m.name || '').toLowerCase()) || (m.firstName && lower.includes(m.firstName.toLowerCase()))
      );
      if (match) {
        actions.push({
          name: 'delete_member',
          args: { memberId: match.id },
        });
        reply = `I have removed **${match.name}** from the genealogical tree and disconnected their kinship relations.`;
      } else {
        reply = `Please specify which family member you would like to delete (for example, "Delete Julian Montgomery").`;
      }
    }
    // Question / Query with RAG Context
    else {
      // Answer using knowledge graph RAG context
      if (ragContext) {
        reply = `Based on the Kinship Archive Knowledge Graph records:\n\n${ragContext.slice(0, 750)}...\n\nWould you like me to highlight their lineage on the canvas, add a milestone event, or create a focused generational workspace?`;
      } else {
        reply = `The Montgomery-Vance Family Archive spans 5 generations from 1872 to the present, beginning with Arthur Montgomery (Master Horologist from Edinburgh) and Eleanor Vance (Botanical Artist & Suffragist). You can ask me to add members, edit details, highlight lineages, or create custom generational workspaces!`;
      }
    }

    return res.json({ reply, actions });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: 'Failed to process assistant request',
      details: error?.message,
    });
  }
});

// Mount Vite middleware for dev or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kinship Archive Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
