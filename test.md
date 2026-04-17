# Coding agent export

**Flow:** Custom Resume

Use this document as a single handoff. The **Implementation Brief** is the primary specification; **Appendix A** maps stable node IDs to labels; **Appendix B** can recreate the diagram in this editor.

---
# Custom Resume — Implementation Brief

This document is a complete specification for building the AI agent pipeline described below. Implement every component exactly as specified, preserve all data-flow connections, and respect the configuration values. Do not add components that are not listed.

---

## Purpose

This system is designed to automate the creation of a personalized resume based on a job description, a repository of skills, and a sample resume format. The target audience includes job seekers looking to tailor their resumes for specific job applications. The outcome is a professionally formatted resume that aligns with the job requirements and highlights the candidate's relevant skills.

---

## How It Works

The process begins with a Chrome extension that extracts job descriptions from a web page and sends them to the system. The extracted job description is stored in a 'Job Description' document for future reference.

The 'Skills Repo' document, containing all the candidate's skills, and the 'Sample Resume' document, providing a template, are used alongside the job description to create a structured prompt. This is facilitated by the 'Prompt Template' node, which organizes the input data into a coherent prompt format for the agent.

The 'Agent' node processes the prompt, generating a draft resume. The agent is configured to iterate up to 10 times to refine the output, but it does not delegate tasks. The draft resume is then passed through 'Guardrails' to ensure it does not contain inappropriate or incorrect information, such as toxic language or personal identifiable information (PII).

Once the guardrails are satisfied, the output is parsed by the 'Output Parser' into a structured resume format, which is then saved as a PDF in the 'Output Resume' document. This ensures the final resume is both well-structured and professionally formatted.

---

## Components

Implement each component below in the order listed. The number corresponds to its position in the pipeline.

### 1. Skills Repo

**Type:** `genericDocument` — Generic document source (PDF, doc, page, spreadsheet export, etc.).

**Configuration:**
  - documentKind: markdown
  - description: This document is contains all skills candidate poses

**Inputs:** Data in
**Outputs:** Data out

### 2. Sample Resume

**Type:** `genericDocument` — Generic document source (PDF, doc, page, spreadsheet export, etc.).

**In this diagram:** This a resume sample, that we build the resume based of

**Configuration:**
  - documentKind: markdown

**Inputs:** Data in
**Outputs:** Data out

### 3. Web page

**Type:** `genericWebPage` — A browsable web page or screen (marketing site, docs, app UI, form, status).

**Configuration:**
  - pageKind: landing
  - description: Job posting website, contains job description

**Inputs:** Data in
**Outputs:** Data out

### 4. Agent

**Type:** `agent` — Autonomous agent that reasons, plans, and calls tools iteratively.

**In this diagram:** Agent creates new resume based on collected job description

**Configuration:**
  - instructions: You are a helpful assistant.
  - maxIterations: 10
  - allowDelegation: false

**Inputs:** Prompt, Observations, Memory
**Outputs:** Tool Requests, Actions, Response

### 5. Output Resume

**Type:** `genericDocument` — Generic document source (PDF, doc, page, spreadsheet export, etc.).

**In this diagram:** This is the output resume built in format provided in sample, based of Skills repo doc

**Configuration:**
  - documentKind: pdf

**Inputs:** Data in
**Outputs:** Data out

### 6. Chrome Extnesion

**Type:** `genericWeb` — Generic web surface (site, portal, scraper target).

**In this diagram:** Chrome extension copy the job description and send it to an agent

**Configuration:**
  - webKind: custom
  - customWebLabel: chromeExtension

**Inputs:** Data in
**Outputs:** Data out

### 7. Job Description

**Type:** `genericDocument` — Generic document source (PDF, doc, page, spreadsheet export, etc.).

**In this diagram:** Collected job description getting saved for future refrence

**Configuration:**
  - documentKind: markdown

**Inputs:** Data in
**Outputs:** Data out

### 8. Prompt Template

**Type:** `promptTemplate` — Renders a Jinja-style template with dynamic variable injection.

**In this diagram:** Structures the input data (job description, skills, and sample resume) into a coherent prompt for the agent.

**Configuration:**
  - template: Answer the following question:

{{question}}

Context:
{{context}}
  - inputVariables: question, context

**Inputs:** Variables, Context
**Outputs:** Prompt

### 9. Output Parser

**Type:** `outputParser` — Parses raw LLM text into structured JSON, YAML, or CSV.

**In this diagram:** Parses the agent's output into a structured resume format.

**Configuration:**
  - format: json
  - schema: {}
  - strictMode: false

**Inputs:** Text
**Outputs:** Structured

### 10. Guardrails

**Type:** `guardrails` — Screens content for toxicity, PII, hallucination, or policy violations.

**In this diagram:** Ensures the generated resume does not contain inappropriate or incorrect information.

**Configuration:**
  - checks: toxicity, pii
  - action: block

**Inputs:** Input
**Outputs:** Passed, Blocked

---

## Data Flow

Wire these connections exactly. Handle IDs specify which output/input port to use.

- **Chrome Extnesion** → **Web page**  `[data] → [data]`
- **Web page** → **Job Description**  `[data] → [data]`
- **Job Description** → **Agent**  `[data] → [prompt]`
- **Skills Repo** → **Agent**  `[data] → [prompt]`
- **Sample Resume** → **Agent**  `[data] → [prompt]`
- **Prompt Template** → **Agent**  `[prompt] → [prompt]`
- **Agent** → **Output Parser**  `[toolRequests] → [text]`
- **Guardrails** → **Output Parser**  `[passed] → [text]`
- **Agent** → **Guardrails**  `[toolRequests] → [input]`
- **Output Parser** → **Output Resume**  `[structured] → [data]`

---

## Implementation Requirements

- **Fidelity**: implement every component listed above — no additions, no omissions.
- **Connections**: wire all data-flow edges exactly as specified, using the correct handle IDs.
- **Configuration**: use the exact values from each component's Configuration section.
- **Execution order**: respect the data-flow direction; parallel branches may run concurrently.
- **Loopbacks**: implement feedback paths as retry/loop logic triggered by the source component.
- **Business rules**: enforce all constraints in the Business Context section throughout the pipeline.
- **Notes**: treat each component's "Implementation note" as binding architectural guidance.
---

## Appendix A — Node ID map (for YAML and APIs)

| Node ID | Type | Label | Description (excerpt) |
| --- | --- | --- | --- |
| `genericDocument-2` | `genericDocument` | Skills Repo | — |
| `genericDocument-3` | `genericDocument` | Sample Resume | This a resume sample, that we build the resume based of |
| `genericWebPage-4` | `genericWebPage` | Web page | — |
| `agent-5` | `agent` | Agent | Agent creates new resume based on collected job description |
| `genericDocument-6` | `genericDocument` | Output Resume | This is the output resume built in format provided in sample, based of Skills repo doc |
| `genericWeb-1` | `genericWeb` | Chrome Extnesion | Chrome extension copy the job description and send it to an agent |
| `genericDocument-1` | `genericDocument` | Job Description | Collected job description getting saved for future refrence |
| `promptTemplate-1` | `promptTemplate` | Prompt Template | Structures the input data (job description, skills, and sample resume) into a coherent prompt for the agent. |
| `outputParser-1` | `outputParser` | Output Parser | Parses the agent's output into a structured resume format. |
| `guardrails-1` | `guardrails` | Guardrails | Ensures the generated resume does not contain inappropriate or incorrect information. |
---

## Appendix B — Diagram YAML (machine-readable)

```yaml
name: Custom Resume
layoutDirection: LR
nodes:
  - id: genericDocument-2
    type: genericDocument
    label: Skills Repo
    config:
      documentKind: markdown
      customKindLabel: ''
      pathOrUrl: ''
      url: ''
      description: This document is contains all skills candidate poses
    position:
      x: 640
      'y': 210
  - id: genericDocument-3
    type: genericDocument
    label: Sample Resume
    description: This a resume sample, that we build the resume based of
    config:
      documentKind: markdown
      customKindLabel: ''
      pathOrUrl: ''
      url: ''
    position:
      x: 640
      'y': 380
  - id: genericWebPage-4
    type: genericWebPage
    accentColor: '#2ea4ff'
    config:
      pageKind: landing
      customPageKindLabel: ''
      pageTitle: ''
      url: ''
      description: Job posting website, contains job description
    position:
      x: 340
      'y': 40
  - id: agent-5
    type: agent
    description: Agent creates new resume based on collected job description
    config:
      instructions: You are a helpful assistant.
      maxIterations: 10
      allowDelegation: false
    position:
      x: 940
      'y': 295
  - id: genericDocument-6
    type: genericDocument
    label: Output Resume
    accentColor: '#ff3d3d'
    description: This is the output resume built in format provided in sample, based of Skills repo doc
    config:
      documentKind: pdf
      customKindLabel: ''
      pathOrUrl: ''
      url: ''
    position:
      x: 1868
      'y': 335
  - id: genericWeb-1
    type: genericWeb
    label: Chrome Extnesion
    accentColor: '#3aee7f'
    description: Chrome extension copy the job description and send it to an agent
    config:
      webKind: custom
      customWebLabel: chromeExtension
      url: ''
    position:
      x: 40
      'y': 40
  - id: genericDocument-1
    type: genericDocument
    label: Job Description
    description: Collected job description getting saved for future refrence
    config:
      documentKind: markdown
      customKindLabel: ''
      pathOrUrl: ''
      url: ''
    position:
      x: 640
      'y': 40
  - id: promptTemplate-1
    type: promptTemplate
    description: >-
      Structures the input data (job description, skills, and sample resume) into a coherent prompt
      for the agent.
    config:
      template: |-
        Answer the following question:

        {{question}}

        Context:
        {{context}}
      inputVariables: question, context
    position:
      x: 640
      'y': 550
  - id: outputParser-1
    type: outputParser
    description: Parses the agent's output into a structured resume format.
    config:
      format: json
      schema: '{}'
      strictMode: false
    position:
      x: 1540
      'y': 345
  - id: guardrails-1
    type: guardrails
    description: Ensures the generated resume does not contain inappropriate or incorrect information.
    config:
      checks: toxicity, pii
      action: block
    position:
      x: 1223
      'y': 38
edges:
  - from: genericWeb-1
    to: genericWebPage-4
    fromHandle: data
    toHandle: data
    executionPriority: 1
  - from: genericWebPage-4
    to: genericDocument-1
    fromHandle: data
    toHandle: data
    executionPriority: 1
  - from: genericDocument-1
    to: agent-5
    fromHandle: data
    toHandle: prompt
    executionPriority: 1
  - from: genericDocument-2
    to: agent-5
    fromHandle: data
    toHandle: prompt
    executionPriority: 1
  - from: genericDocument-3
    to: agent-5
    fromHandle: data
    toHandle: prompt
    executionPriority: 1
  - from: promptTemplate-1
    to: agent-5
    fromHandle: prompt
    toHandle: prompt
    executionPriority: 1
  - from: agent-5
    to: outputParser-1
    fromHandle: toolRequests
    toHandle: text
    executionPriority: 1
  - from: guardrails-1
    to: outputParser-1
    fromHandle: passed
    toHandle: text
    executionPriority: 1
  - from: agent-5
    to: guardrails-1
    fromHandle: toolRequests
    toHandle: input
    executionPriority: 1
  - from: outputParser-1
    to: genericDocument-6
    fromHandle: structured
    toHandle: data
    executionPriority: 1
```
