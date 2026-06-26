ISOCODELABS Design System

README.md

Why This Repository Exists

This repository exists to solve a problem.

Modern AI coding agents are capable of building complete applications.

However, they cannot consistently reproduce a company’s design philosophy, product thinking or brand identity unless those principles are explicitly documented.

Most projects solve this by writing a detailed PRD for every website or product.

That works for functionality.

It does not create consistency.

The purpose of this repository is to provide the permanent foundation that every future project inherits.

Think of these documents as the company’s operating system.

Every project,

website,

dashboard,

application,

landing page,

and product PRD should build upon this foundation rather than redefining it.

⸻

Repository Philosophy

Every project answers three different questions.

1. What are we building?

Answered by the project’s own PRD.

The PRD defines:

* business requirements
* functionality
* users
* pages
* features
* workflows
* technical implementation

The PRD is unique for every project.

⸻

2. How should it look and behave?

Answered by design.md.

This document ensures every product shares the same design language regardless of functionality.

⸻

3. Why should it feel this way?

Answered by brand.md.

This document ensures every product communicates the same philosophy,

values,

thinking,

and user experience.

⸻

Together,

these three layers produce products that are unique,

yet unmistakably ISOCODELABS.

⸻

Repository Structure

README.md
design.md
brand.md
child-brand.md

Each document has one responsibility.

No document should duplicate another.

⸻

Document Responsibilities

design.md

Purpose

Defines the complete ISOCODELABS design language.

Why it exists

Without this document,

every AI agent would invent a new visual language,

interaction style,

animation philosophy,

spacing system,

and storytelling approach for every project.

Over time,

the company would lose consistency.

This document ensures every product looks,

moves,

and feels like it belongs to the same family.

Questions it answers

* How should layouts be designed?
* How should interfaces feel?
* How should users experience motion?
* How should dashboards behave?
* How should products tell stories?
* How should components behave?
* How should responsive design work?
* How should interfaces be reviewed?

It defines how software is experienced.

⸻

brand.md

Purpose

Defines the identity of ISOCODELABS.

Why it exists

A beautiful interface without philosophy is simply decoration.

This document explains why ISOCODELABS exists,

what it believes,

what it refuses to become,

how it communicates,

how it treats customers,

and how every important decision should be made.

Every product should inherit these beliefs.

Questions it answers

* Why does ISOCODELABS exist?
* What does it believe?
* Who is it for?
* Who is it not for?
* How should it communicate?
* What kind of products should it build?
* How should difficult decisions be made?

It defines how ISOCODELABS thinks.

⸻

child-brand.md

Purpose

Defines how child products inherit the ISOCODELABS identity.

Why it exists

Not every product should sound identical.

Not every product should have the same personality.

However,

every ISOCODELABS child product should still feel like it came from the same company.

This document defines:

* what every child must inherit,
* what every child must create,
* what no child is allowed to change.

Without this document,

every new product risks becoming an entirely different brand.

Questions it answers

* What philosophy is inherited?
* What may be customized?
* What is protected?
* How should new product identities be created?

It defines how new ISOCODELABS products evolve without losing their identity.

⸻

Which Documents Should Be Read?

Determine what is being built before loading documents.

⸻

Building an ISOCODELABS Website

Read:

README.md
↓
design.md
↓
brand.md
↓
Project PRD

⸻

Building an ISOCODELABS Child Product

Read:

README.md
↓
design.md
↓
brand.md
↓
child-brand.md
↓
Product PRD

⸻

Building an Independent Daughter Company

Read:

README.md
↓
design.md (optional)
↓
Daughter Company's own brand documents
↓
Project PRD

A daughter company is intentionally independent.

It does not inherit the ISOCODELABS philosophy.

⸻

Relationship Between Documents

                 Project PRD
                      │
                      │
      ┌───────────────┴───────────────┐
      │                               │
 design.md                      brand.md
      │                               │
      └───────────────┬───────────────┘
                      │
              child-brand.md
                      │
              Child Product Identity

The PRD defines what to build.

The design system defines how it is experienced.

The brand defines why it feels that way.

The child specification defines how new products inherit the parent identity while remaining unique.

Each document has one responsibility.

Each document should remain independent.

⸻

Final Principle

These documents are intended to outlive individual projects.

Projects will change.

Technologies will change.

Products will come and go.

These documents should remain the permanent foundation upon which future ISOCODELABS experiences are built.

When uncertainty exists,

do not invent new philosophy.

Do not invent new design language.

Begin with these documents.

Then build upon them.

That is how craftsmanship scales.


Authority Hierarchy

When multiple documents appear to conflict,

resolve them using the following order of authority.

1. Explicit User Instructions
        ↓
2. Project PRD
        ↓
3. child-brand.md (only for child products)
        ↓
4. brand.md
        ↓
5. design.md
        ↓
6. README.md

Higher-priority documents override lower-priority documents.

Do not silently ignore conflicts.

Instead,

identify the conflict,

explain it,

and recommend the most appropriate resolution.

⸻

AI Operating Workflow

Every project should follow the same reasoning process.

Never begin implementation immediately.

First understand the problem.

Step 1
Determine what is being built.
↓
Step 2
Determine whether it is:
• ISOCODELABS
• Child Product
• Daughter Company
↓
Step 3
Load the required documents.
↓
Step 4
Read the Project PRD completely.
↓
Step 5
Identify any conflicts between the PRD and the inherited philosophy.
↓
Step 6
Resolve those conflicts before implementation.
↓
Step 7
Design the experience.
↓
Step 8
Review against design.md.
↓
Step 9
Review against brand.md.
↓
Step 10
Implement.
↓
Step 11
Perform a final self-review before presenting the result.

Reason before implementation.

Implementation without understanding is considered incorrect.

⸻

Modification Rules

These documents form the permanent foundation of the ISOCODELABS ecosystem.

They should remain stable.

Project requirements should evolve.

The foundation should not.

⸻

Rarely Modified

These files should only change when the philosophy or system itself evolves.

* README.md
* design.md
* brand.md
* child-brand.md

⸻

Frequently Modified

These files are expected to change for every project.

* Project PRD
* Product specifications
* Technical architecture
* Database schema
* API documentation
* Implementation details

⸻

System Changes vs Project Changes

If a change benefits only one project,

modify the PRD.

If a change benefits every future project,

consider updating the system documents.

Never modify the foundation merely to accommodate one exception.

⸻

AI Behaviour

The AI is expected to behave as a senior product team,

not a code generator.

Before generating any solution,

it should ask itself:

* Do I understand the business objective?
* Have I loaded every required document?
* Am I preserving inherited philosophy?
* Am I introducing unnecessary complexity?
* Does this improve the user’s experience?
* Would this still feel like an ISOCODELABS product?

If the answer to any question is uncertain,

clarification should be sought before implementation.

⸻

Success Criteria

A successful implementation satisfies all of the following.

The functionality satisfies the PRD.

The experience follows design.md.

The philosophy follows brand.md.

If applicable,

the product identity follows child-brand.md.

The implementation should never feel like four separate documents were applied independently.

It should feel like one coherent product.

⸻

Repository Maintenance

As ISOCODELABS grows,

new projects,

products,

and companies will be created.

This repository should remain intentionally small.

Avoid creating new foundational documents unless a responsibility cannot logically belong to an existing one.

Prefer extending an existing philosophy over introducing another layer.

The objective is a system that remains understandable years from now.

⸻

Final Principle

These documents do not exist to restrict creativity.

They exist to preserve identity.

Every project should solve a different problem.

Every product should have its own purpose.

Every team should have room to innovate.

Yet every experience should demonstrate the same craftsmanship,

the same respect for users,

the same engineering discipline,

and the same commitment to perfecting the experience.

That is the purpose of this repository.

It is not a collection of guidelines.

It is the operating system from which every ISOCODELABS product is built.

⸻

End of README.md v1.0