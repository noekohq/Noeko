import { ISafeIdea } from "../database/models/ideas";
import { ISafeUser } from "../database/models/user";

export const newScratchpad = (user: ISafeUser, firstIdea: ISafeIdea) => {
  return `
  <h2>Welcome to the Beta!</h2>

  <p>Hello ${user.firstName} and welcome to <a href="https://www.noeko.app">Noeko</a>, the self-organizing knowledge-base!</p>

  <p>Let’s get you started! Head over to <span data-idea-id="${firstIdea.id.toString()}" data-dream-idea="">your first idea</span>, and read through it to get oriented.</p>

  <blockquote><p>We’re currently in Beta, and making improvements every day, but if you see anything strange, don’t hesitate to leave feedbaack!</p></blockquote><p></p>
  `;
};

export const firstIdea = (user: ISafeUser) => {
  return `
  <p>This is your <em>first</em> idea!</p>
  <p>An idea in <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.noeko.app">Noeko</a> follows similar principles to other Markdown-based editors. You can<em> apply familiar formatting</em>, link to other ideas with “[[]]” syntax, and use “/” to insert content.</p>
  <p>Try typing “your second idea” in the center of the brackets: [[]]</p>
  <p>Try placing your cursor after the “/”:</p>
  <p>/</p>
  <p><span>select text to apply formatting</span>, connect ideas, or even create new ideas without leaving the editor.<em> Our biggest priority is your experience using Noeko,</em> so <strong>please don’t hesitate to give us feedback!</strong> (you will find a megaphone button in the left sidebar.)</p>
  <h1>Orientation</h1>
  <p><em>In the right sidebar</em>, you’ll see your search bar, <em>you can search with natural language</em>, or based on text! (Try searching for “My second idea”)</p>
  <p><em>In the left sidebar</em>, you’ll see relevant context about the idea you’re currently working in.</p>
  <p>You can <em>connect</em> ideas, either by dragging-and-dropping, or clicking on the idea to reveal a “Connect” button.</p>
  <h1>Video Tutorial</h1>
  <p>For a quick video tutorial on Noeko’s basic features, check this out:</p>
  <div data-dream-youtube-video="">
    <iframe src="https://www.youtube.com/embed/ndP8Sc2CGZw" data-start="0" frameborder="0" allowfullscreen="true" title="Embedded YouTube Video"></iframe>
  </div>
  `;
};

export const secondIdea = (user: ISafeUser) => {
  return `
  <h2>Noeko’s Philosophy</h2>
  <p>We were tired of saving information, taking notes, writing essays, or any number of other things, just to have that information sit, static and unutilized in a notebook somewhere. That’s why we built Noeko, a knowledge-base focused on making the most of your knowledge. When you save something, it doesn’t die, instead it’s part of a living ecosystem of information that builds and compounds.</p>
  <p>Ideas aren’t any fun all by themselves, so Noeko brings up your relevant context as you work (← on the left)! This way, <strong>no knowledge is lost</strong>, because ideas are resurfaced automatically for you, so they come up again when they’re useful. You can search (in the left sidebar →) by keyword<em> or</em> natural language, or use <a target="_blank" rel="noopener noreferrer nofollow" href="/spyglass">Spyglass</a> to ask your knowledge anything, and recieve direct, grounded answers.</p>
  <p>Of course, retrieval isn’t the only thing that Noeko is good for, it’s just the foundation!</p>
  <blockquote>
    <p>Learn more about Noeko’s philosophy <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.noeko.app/philosophy/">on our website</a>.</p>
  </blockquote>
  <h2>Other Features</h2>
  <p>Noeko is built for knowledge and research, and our features support that. Some of these include:</p>
  <ul>
    <li>
      <p><strong>Constellation:</strong> you can view all of your knowledge as a graph of interconnected ideas, exploring your ideas from the top-down</p>
    </li>
    <li>
      <p><strong>Rabbitholes:</strong> create rabbitholes, include anything, and when you “enter” a rabbithole, everything you create or add will be automatically included!</p>
    </li>
    <li>
      <p><strong>Tags:</strong> add tags to organize your knowledge, and Noeko will automatically suggest relevant applications on relevant ideas, and Tags will get smarter as you use them!</p>
    </li>
    <li>
      <p><strong>Spyglass:</strong> your built-in answer engine, it will search, analyze, and answer your questions based on the knowledge you have saved!</p>
    </li>
  </ul>
  <blockquote>
    <p>For more comprehensive documentation of these features and more, check out <a target="_blank" rel="noopener noreferrer nofollow" href="https://docs.noeko.app">The Official Noeko Documentation!</a></p>
  </blockquote>
  <p></p>
  `;
};
