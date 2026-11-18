---
name: diagram-maker
description: Create, revise, or export editable research figures, database schemas, workflows, and software engineering diagrams from a study protocol, requirements, source code, or an existing figure.
---

# Diagram Maker

Start with the question the reader must answer. Identify the subject, audience, system boundary, and whether the figure describes a proposal, an observed process, or an implementation. Use the user's requested notation and output format. When these are open, choose from the [notation guide](references/notation.md).

## Build the diagram

1. Read the smallest relevant source. For a study, use the protocol or manuscript. For an implemented system, trace the relevant models, services, routes, or deployment configuration. For a requirements view, use the approved specification. If sources disagree, label the view by its source and surface the discrepancy.
2. List the entities, actors, stages, and relationships the reader needs. For each consequential arrow, identify what it means and what supports it. Distinguish an observed dependency from a hypothesis. Leave unknown cardinalities or counts unspecified.
3. Produce editable diagram source. Mermaid works for many flow, sequence, state, and entity diagrams. Use the repository's [Mermaid reference](../mermaid-diagrams/SKILL.md) when authoring that syntax. Use a notation-capable editor or renderer for formal UML, BPMN, or a requested native format. If the requested diagram falls outside the guide, identify its actual notation and validate its symbols and relationships against a reference.
4. For multiple views, reuse entity names, identifiers, role labels, and boundaries. A DFD level must balance its external flows with its parent. A sequence diagram's messages must correspond to actions available to the actors shown in the use case view.
5. Render and inspect the figure at its intended width. Check arrow direction, branch labels, crossings, clipped text, and legibility in grayscale. Walk a representative path and an alternate path where one exists. For schemas, trace a real join or document reference in both directions. If a renderer is unavailable, deliver usable source and identify the visual check still pending.

## Deliver or revise

For a chat request, an inline diagram with editable source may suffice. For a manuscript, provide the requested publication format and editable source. Prefer vector output when the destination supports it. Size a raster export for its printed width. Write a caption that identifies the subject and scope.

For a replacement, locate the exact caption and image, including floating images. Match the manuscript's sizing and numbering, change only the requested figures, and inspect the exported pages for caption separation or distortion. Keep research methodology figures distinct from product workflows when deciding which figures a request covers.
