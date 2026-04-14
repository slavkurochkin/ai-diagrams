/**
 * MCP server: node catalog + patch validation for external agents (stdio).
 * Run: npm run mcp:workflow
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  formatEvalNodeCatalogMarkdown,
  formatFullNodeCatalogMarkdown,
  getNodeCatalogForAI,
} from '../lib/nodeCatalogForAI.js'
import { validateWorkflowPatches } from '../lib/workflowPatch.js'

const SerializedNodeSchema = z.object({
  id: z.string(),
  nodeType: z.string(),
  label: z.string(),
  config: z.record(z.string(), z.unknown()),
})

const SerializedEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string().nullable(),
  target: z.string(),
  targetHandle: z.string().nullable(),
})

const server = new McpServer({ name: 'agentflow-workflow', version: '0.1.0' })

server.tool(
  'get_node_catalog',
  'Return the full JSON node catalog (types, descriptions, ports, config fields).',
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(getNodeCatalogForAI(), null, 2) }],
  }),
)

server.tool(
  'get_node_catalog_markdown',
  'Markdown catalog grouped by category — suitable for LLM system prompts.',
  async () => ({
    content: [{ type: 'text', text: formatFullNodeCatalogMarkdown() }],
  }),
)

server.tool(
  'get_eval_node_catalog_markdown',
  'Markdown list of evaluation-focused node types (eval category + evaluator).',
  async () => ({
    content: [{ type: 'text', text: formatEvalNodeCatalogMarkdown() }],
  }),
)

server.tool(
  'validate_workflow_patches',
  'Validate ordered workflow patches (addNode, addEdge, …) against optional current nodes and edges.',
  {
    patches: z.array(z.record(z.string(), z.unknown())),
    nodes: z.array(SerializedNodeSchema).optional(),
    edges: z.array(SerializedEdgeSchema).optional(),
  },
  async (args) => {
    const nodes = args.nodes ?? []
    const edges = args.edges ?? []
    const { validPatches, errors } = validateWorkflowPatches(args.patches, nodes, edges)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ validPatches, validationErrors: errors }, null, 2),
        },
      ],
    }
  },
)

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
