#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const server = new Server(
  {
    name: 'mcp-supabase',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Supabase client initialization
let supabase = null;

function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // CRUD Operations
      {
        name: 'supabase_select',
        description: 'Select/query data from a Supabase table with optional filters, ordering, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name to query' },
            columns: { type: 'string', description: 'Columns to select (comma-separated) or * for all' },
            filters: {
              type: 'object',
              description: 'Filter conditions as key-value pairs',
              additionalProperties: true
            },
            orderBy: { type: 'string', description: 'Column to order by' },
            ascending: { type: 'boolean', description: 'Sort ascending (true) or descending (false)', default: true },
            limit: { type: 'number', description: 'Maximum number of rows to return' },
            offset: { type: 'number', description: 'Number of rows to skip' }
          },
          required: ['table']
        }
      },
      {
        name: 'supabase_insert',
        description: 'Insert new records into a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name to insert into' },
            data: {
              type: 'array',
              description: 'Array of objects representing rows to insert',
              items: { type: 'object', additionalProperties: true }
            },
            returning: { type: 'string', description: 'Columns to return after insert (comma-separated) or * for all' }
          },
          required: ['table', 'data']
        }
      },
      {
        name: 'supabase_update',
        description: 'Update records in a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name to update' },
            data: {
              type: 'object',
              description: 'Object with column-value pairs to update',
              additionalProperties: true
            },
            filters: {
              type: 'object',
              description: 'Filter conditions to specify which rows to update',
              additionalProperties: true
            },
            returning: { type: 'string', description: 'Columns to return after update (comma-separated) or * for all' }
          },
          required: ['table', 'data', 'filters']
        }
      },
      {
        name: 'supabase_delete',
        description: 'Delete records from a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name to delete from' },
            filters: {
              type: 'object',
              description: 'Filter conditions to specify which rows to delete',
              additionalProperties: true
            },
            returning: { type: 'string', description: 'Columns to return for deleted rows (comma-separated) or * for all' }
          },
          required: ['table', 'filters']
        }
      },
      // Raw SQL Operations
      {
        name: 'supabase_sql',
        description: 'Execute raw SQL queries on the Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query to execute' },
            params: {
              type: 'array',
              description: 'Query parameters for parameterized queries',
              items: { type: 'any' }
            }
          },
          required: ['query']
        }
      },
      // Table Management
      {
        name: 'supabase_create_table',
        description: 'Create a new table in the Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'Name of the table to create' },
            columns: {
              type: 'array',
              description: 'Array of column definitions',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Column name' },
                  type: { type: 'string', description: 'PostgreSQL data type (e.g., text, integer, uuid, timestamp)' },
                  constraints: { type: 'string', description: 'Column constraints (e.g., PRIMARY KEY, NOT NULL, UNIQUE)' }
                },
                required: ['name', 'type']
              }
            },
            options: { type: 'string', description: 'Additional table options (e.g., IF NOT EXISTS)' }
          },
          required: ['tableName', 'columns']
        }
      },
      {
        name: 'supabase_drop_table',
        description: 'Drop/delete a table from the Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'Name of the table to drop' },
            cascade: { type: 'boolean', description: 'Use CASCADE to drop dependent objects', default: false },
            ifExists: { type: 'boolean', description: 'Use IF EXISTS to avoid errors if table doesn\'t exist', default: true }
          },
          required: ['tableName']
        }
      },
      // Schema Operations
      {
        name: 'supabase_list_tables',
        description: 'List all tables in the Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            schema: { type: 'string', description: 'Schema name (default: public)', default: 'public' }
          }
        }
      },
      {
        name: 'supabase_describe_table',
        description: 'Get detailed information about a table structure',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'Name of the table to describe' },
            schema: { type: 'string', description: 'Schema name (default: public)', default: 'public' }
          },
          required: ['tableName']
        }
      },
      // Storage Operations
      {
        name: 'supabase_storage_upload',
        description: 'Upload a file to Supabase Storage',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'Storage bucket name' },
            path: { type: 'string', description: 'File path within the bucket' },
            file: { type: 'string', description: 'File content (base64 encoded for binary files)' },
            contentType: { type: 'string', description: 'MIME type of the file' },
            upsert: { type: 'boolean', description: 'Overwrite file if it already exists', default: false }
          },
          required: ['bucket', 'path', 'file']
        }
      },
      {
        name: 'supabase_storage_download',
        description: 'Download a file from Supabase Storage',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'Storage bucket name' },
            path: { type: 'string', description: 'File path within the bucket' }
          },
          required: ['bucket', 'path']
        }
      },
      {
        name: 'supabase_storage_delete',
        description: 'Delete files from Supabase Storage',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'Storage bucket name' },
            paths: {
              type: 'array',
              description: 'Array of file paths to delete',
              items: { type: 'string' }
            }
          },
          required: ['bucket', 'paths']
        }
      }
    ]
  };
});

// Tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!supabase) {
    initializeSupabase();
  }

  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'supabase_select': {
        let query = supabase.from(args.table);

        if (args.columns && args.columns !== '*') {
          query = query.select(args.columns);
        } else {
          query = query.select('*');
        }

        if (args.filters) {
          Object.entries(args.filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        if (args.orderBy) {
          query = query.order(args.orderBy, { ascending: args.ascending ?? true });
        }

        if (args.limit) {
          query = query.limit(args.limit);
        }

        if (args.offset) {
          query = query.range(args.offset, args.offset + (args.limit || 1000) - 1);
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data, count: data?.length || 0 }, null, 2)
            }
          ]
        };
      }

      case 'supabase_insert': {
        let query = supabase.from(args.table).insert(args.data);

        if (args.returning) {
          query = query.select(args.returning);
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data, inserted: data?.length || 0 }, null, 2)
            }
          ]
        };
      }

      case 'supabase_update': {
        let query = supabase.from(args.table).update(args.data);

        Object.entries(args.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        if (args.returning) {
          query = query.select(args.returning);
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data, updated: data?.length || 0 }, null, 2)
            }
          ]
        };
      }

      case 'supabase_delete': {
        let query = supabase.from(args.table).delete();

        Object.entries(args.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        if (args.returning) {
          query = query.select(args.returning);
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data, deleted: data?.length || 0 }, null, 2)
            }
          ]
        };
      }

      case 'supabase_sql': {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: args.query,
          sql_params: args.params || []
        });

        if (error) {
          // If RPC doesn't exist, try direct query
          const result = await supabase.from('').select().limit(1);
          if (result.error) throw new Error('Raw SQL execution not available. Create exec_sql RPC function or use other tools.');
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data }, null, 2)
            }
          ]
        };
      }

      case 'supabase_create_table': {
        const columnDefs = args.columns.map(col =>
          `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`
        ).join(', ');

        const sql = `CREATE TABLE ${args.options || ''} ${args.tableName} (${columnDefs})`;

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Table '${args.tableName}' created successfully` }, null, 2)
            }
          ]
        };
      }

      case 'supabase_drop_table': {
        const ifExistsClause = args.ifExists ? 'IF EXISTS' : '';
        const cascadeClause = args.cascade ? 'CASCADE' : '';
        const sql = `DROP TABLE ${ifExistsClause} ${args.tableName} ${cascadeClause}`;

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Table '${args.tableName}' dropped successfully` }, null, 2)
            }
          ]
        };
      }

      case 'supabase_list_tables': {
        const sql = `
          SELECT table_name, table_type
          FROM information_schema.tables
          WHERE table_schema = $1
          ORDER BY table_name
        `;

        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: sql,
          sql_params: [args.schema || 'public']
        });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, tables: data }, null, 2)
            }
          ]
        };
      }

      case 'supabase_describe_table': {
        const sql = `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `;

        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: sql,
          sql_params: [args.schema || 'public', args.tableName]
        });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, columns: data }, null, 2)
            }
          ]
        };
      }

      case 'supabase_storage_upload': {
        const fileBuffer = Buffer.from(args.file, 'base64');

        const { data, error } = await supabase.storage
          .from(args.bucket)
          .upload(args.path, fileBuffer, {
            contentType: args.contentType,
            upsert: args.upsert
          });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data }, null, 2)
            }
          ]
        };
      }

      case 'supabase_storage_download': {
        const { data, error } = await supabase.storage
          .from(args.bucket)
          .download(args.path);

        if (error) throw error;

        const arrayBuffer = await data.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data: { file: base64, size: arrayBuffer.byteLength } }, null, 2)
            }
          ]
        };
      }

      case 'supabase_storage_delete': {
        const { data, error } = await supabase.storage
          .from(args.bucket)
          .remove(args.paths);

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data }, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            details: error.details || error.hint || null
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Supabase server running on stdio');
}

main().catch(console.error);