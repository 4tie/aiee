import { z } from 'zod';
import { insertFreqtradeConnectionSchema, insertProjectSchema, freqtradeConnections, projects, conversations, messages } from './schema';

export const api = {
  freqtrade: {
    listConnections: {
      method: 'GET' as const,
      path: '/api/freqtrade/connections',
      responses: {
        200: z.array(z.custom<typeof freqtradeConnections.$inferSelect>()),
      },
    },
    createConnection: {
      method: 'POST' as const,
      path: '/api/freqtrade/connections',
      input: insertFreqtradeConnectionSchema,
      responses: {
        201: z.custom<typeof freqtradeConnections.$inferSelect>(),
        400: z.any(),
      },
    },
    getConnection: {
      method: 'GET' as const,
      path: '/api/freqtrade/connections/:id',
      responses: {
        200: z.custom<typeof freqtradeConnections.$inferSelect>(),
        404: z.any(),
      },
    },
    deleteConnection: {
      method: 'DELETE' as const,
      path: '/api/freqtrade/connections/:id',
      responses: {
        204: z.void(),
        404: z.any(),
      },
    },
    // Proxy endpoints for Freqtrade API
    ping: {
      method: 'GET' as const,
      path: '/api/freqtrade/:id/ping',
      responses: {
        200: z.object({ status: z.string() }),
      },
    },
    trades: {
      method: 'GET' as const,
      path: '/api/freqtrade/:id/trades',
      responses: {
        200: z.object({ trades: z.array(z.any()) }), // Using any for simplicity as trade object is complex
      },
    },
    openTrades: {
      method: 'GET' as const,
      path: '/api/freqtrade/:id/open-trades',
      responses: {
        200: z.array(z.any()),
      },
    },
    profit: {
      method: 'GET' as const,
      path: '/api/freqtrade/:id/profit',
      responses: {
        200: z.any(),
      },
    },
    balance: {
      method: 'GET' as const,
      path: '/api/freqtrade/:id/balance',
      responses: {
        200: z.any(),
      },
    },
    performance: {
      method: 'GET' as const,
      path: '/api/freqtrade/:id/performance',
      responses: {
        200: z.array(z.any()),
      },
    },
    backtest: {
      method: 'POST' as const,
      path: '/api/freqtrade/:id/backtest',
      input: z.object({
        projectName: z.string(),
        timerange: z.string().optional(),
        timeframe: z.string().optional(),
      }),
      responses: {
        200: z.any(),
      },
    },
  },
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id',
      input: insertProjectSchema.partial(),
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
      },
    }
  },
  // Chat routes matching the integration
  chat: {
    getConversations: {
      method: 'GET' as const,
      path: '/api/conversations',
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect>()),
      },
    },
    getConversation: {
      method: 'GET' as const,
      path: '/api/conversations/:id',
      responses: {
        200: z.custom<typeof conversations.$inferSelect & { messages: typeof messages.$inferSelect[] }>(),
        404: z.any(),
      },
    },
    createConversation: {
      method: 'POST' as const,
      path: '/api/conversations',
      input: z.object({ title: z.string().optional() }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
      },
    },
    deleteConversation: {
      method: 'DELETE' as const,
      path: '/api/conversations/:id',
      responses: {
        204: z.void(),
      },
    },
    sendMessage: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages',
      input: z.object({
        content: z.string(),
        model: z.string().optional(),
      }),
      responses: {
        200: z.any(), // Stream response
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
