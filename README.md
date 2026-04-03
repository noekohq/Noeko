<h1 align="center"> Noeko </h1>

<h4 align="center">
    Noeko is an open-source, self-hostable collaborative knowledge base with the goal of removing the maintenance tax from knowledge management. 
</h4>

<div align="center">
    <a href="https://www.noeko.app">Website</a> |
    <a href="https://blog.noeko.app/">Blog</a> |
    <a href="https://docs.noeko.app/">Documentation</a> |
    <a href="https://www.noeko.app/roadmap">Roadmap</a>
</div>
<br></br>

<p align="center">
    <a href="https://noeko.app">Sign In Online</a>
</p>

## Table of Contents
- 💡 [Why Noeko?](#why-noeko)
- 🚀 [Getting Started](#getting-started)
- 🤝 [Community & Support](#community--support)
- 🗺️ [Features & Roadmap](#features--roadmap)
- 💻 [Tech Stack](#tech-stack)
- 🛠️ [Contributing & Development](#contributing--development)
- ⚖️ [License](#license)
- 🙏 [Thank You](#thank-you)

## Why Noeko

As avid PKMS enthusiasts ourselves, we've always found utility in storing and organizing our information, but we were tired of having to act as database administrators just to create a system that resurfaces relevant context when its useful. If capturing a thought requires finding the right folder, remembering and choosing the right tags, defining properties, and creating a title before I can even start typing, then most of the time we'd rather just not use the system at all. Every time I have to think about organization, or try to remember exact lexical terms to find a connection, it drains the mental bandwidth that I'd rather be spending on my thoughts and research.

Radical simplicity and minimalism are tempting because they succeed at removing the maintenance tax of knowledge management. However, they do so at the cost of functionality and performance. Insertion cost is reduced because the structure is flat and you don't have fancy organizational features. However, you pay at retrieval time, because that knowledge is now harder to find in the structureless schema and won't resurface when you want it to. We shouldn't have to sacrifice power and functionality for the sake of a smoother and simpler experience.

Noeko was conceptualized to bridge that gap. Ease-of-use of something like Apple Notes, with the retrieval performance and information expressibility of Notion or Obsidian. While we're still in early stages, we believe we're on our way to achieving this goal. Noeko uses a graph-based vector store to model knowledge as high-dimensional semantic entities that can be queried based on meaning, not just text. Put simply you can search, tag, & connect based on meaning.

## Getting Started

You can get started with Noeko in three different ways depending on what you're trying to do.

- To _self-host_ Noeko for free, check out the [Self Hosting Guide](./documentation/SELF-HOSTING.md)
- To _use Noeko through the hosted online service_, please apply to join the [waitlist](https://waitlist.noeko.app)
- To _contribute_ to Noeko or otherwise work on development, check out the [Contributing Guide](./documentation/CONTRIBUTING.md)

## Community & Support

Get support via [support@noeko.app](mailto:support@noeko.app). Connect with the community through our online forums and Discord.

**Community**

- [Join the Discord](https://discord.gg/TY9sna9ZbT)
- [Check out our Subreddit](https://reddit.com/r/noeko)

**Social Media**

- [Our Substack](https://noeko.substack.com)
- [X/Twitter](https://x.com/noekohq)
- [Our YouTube Channel](https://www.youtube.com/@noeko-pkm)

## Features & Roadmap

Noeko is currently in Beta, and working consistently toward a stable release. To contribute to development or design, see [the contributing guide](./documentation/CONTRIBUTING.md). Follow feature development more closely through the [Issue Tracker](https://github.com/noekohq/noeko/issues) or via the [roadmap](https://www.noeko.app/roadmap). Submit feedback through issues directly, or via [feedback@noeko.app](mailto:feedback@noeko.app).

> [!note]
> During this Beta period, apart from the application being entirely available to self-host or use locally for free, the hosted service will also remain free with limits on storage and compute.

### Feature Matrix

| Feature | Description | Status |
| --- | --- | --- |
| 📝 Note-taking | Capture and manage your personal notes | Fully Supported |
| 🌌 Knowledge-graph | Connect notes to build your interactive Constellation | Fully supported |
| 👥 Collaboration | Share your ideas and collaborate with others | Fully supported |
| 🔍 Search | Search your materials semantically or lexically | Fully supported |
| 📦 Portability | Import from or export to markdown directly | Fully supported |
| 🔭 Spyglass | A personal answer engine that directly references your knowledge | Beta |
| 🌍 Internationalization | Customize the interface to your preferred language | Under Development |
| 🎨 Themes | Adapt the interface to your preferred aesthetic | Under Development |
| 🐇 Rabbitholes | Self-building workspaces that constrain context to a specific topic | Active Development |
| 📚 Sources | Upload PDFs and other external materials for research and study | Active Development |
| 🧩 Web Extension | Capture and retrieve materials wherever you are on the web | Planned |
| 🔌 API | Interact programmatically with your Noeko server | Planned |
| 🎙️ Voice Notes | Capture knowledge through audio recordings | Planned |

Features not discussed here are either too early to detail, or not planned. 

## Tech Stack

Noeko was built from the ground up using TypeScript, React, Express.js, and SurrealDB. For a more in-depth look, see the [Technical Breakdown](./documentation/TECHNICAL-BREAKDOWN.md) for a detailed guide. For details on migrations, refactors, and ongoing projects see [Growing Zones](./documentation/growing_zones/INDEX.md). We also make use of various third-party dependencies to achieve Noeko's functionality.

**Frontend**

- React v19
- TypeScript v5
- Vite v7
- Tanstack `react-query` v5
- React Router v7

**Backend**

- Bun 1.3 (but generally LTS)
- Express v5

**Database**

- SurrealDB v2 (prospective update to v3)

**LLM Features**
Noeko is built to be model and provider agnostic, we rely on third-parties for embedding generation and LM generation.

## Contributing & Development

See the [Full Contribution Guide](./documentation/CONTRIBUTING.md) for further information and instructions. We welcome contributions from anyone interested in making meaningful improvements to Noeko, whether it's opening an issue or a PR.

## License

Noeko is released under the Affero General Public License (AGPL), an OSI-approved Open Source license. Please refer to the [License](./LICENSE.md) for full terms of the license.

> [!note]
> Noeko's core service will always be available Open-Source. For some dedicated enterprise functionality in the future, we may adopt a sustainable dual-licensing model.

## Thank You

Thank you to everyone who has provided feedback, or direct contributions to the application who allow us to keep developing and improving Noeko.

### Contributors & Team

- [Aidan Tilgner](https://github.com/AidanTilgner) - Maintainer
- [Bilal Azhar](https://github.com/bilalazh) - Founding Design Contributor
- [Laney Tilgner](https://github.com/coffeeBean29) - Core Design Contributor
