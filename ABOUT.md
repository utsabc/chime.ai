# About the Project

## Inspiration
The inspiration behind this project stemmed from a common frustration many of us face during web browsing: information overload. Often, web pages are lengthy and packed with dense content, making it difficult to locate specific answers or insights while researching a topic. Additionally, language barriers can hinder comprehension when exploring content in a foreign language. I envisioned a solution that would enable seamless interaction with webpage content, regardless of its complexity or language, making browsing smarter, more accessible, and efficient.

## What I Learned
This project was an incredible learning experience that deepened our understanding of Chrome's built-in AI capabilities. I learned how to:

- Leverage Chrome's **Prompt API** to create contextual and dynamic conversations with webpage content.
- Integrate **Translation and Language Detection APIs** to ensure multilingual interactions and responses, opening up accessibility for global users.
- Utilize the **Summarization API** to distill complex and verbose content into concise, clear insights, making it easier for users to grasp key ideas.
- Optimize browser-based AI functionalities to run entirely on-device, avoiding server calls and enhancing user privacy.
Through this process, I also explored the nuances of designing for real-time interactions and managing varied user expectations.


## How I Built the Project
I built this Chrome Extension with a focus on user experience and cutting-edge AI integrations. Here’s how I approached it:

### Understanding User Needs:

Identified common browsing pain points like cumbersome navigation, language barriers, and difficulty in extracting key insights.

### Technical Integration:

- **Prompt API**: Used for enabling contextual, real-time chat interactions with the content of the current webpage.
- **Translation and Language Detection APIs**: Allowed users to interact and receive responses in their preferred language, breaking language barriers.
- **Summarization API**: Implemented to generate multilingual summaries of the webpage content, helping users quickly grasp the essence of a page.

### Design and Implementation:

- Designed a clean and intuitive UI for the extension that integrates seamlessly into the Chrome browser.
- Ensured the extension works reliably across various webpage types, including non-English content.
- Prioritized efficiency and privacy by relying entirely on Chrome’s on-device AI models.

### Testing and Iteration:

Conducted extensive testing on diverse web pages to refine the extension’s performance and ensure robust multilingual support.

### Challenges I Faced
Building this extension was not without its hurdles:

-  The major challenge is breaking down the current page content inso chunks and using the relevant chunk of content for a given prompt
    - To solve this I have used `langchain/text_splitter` to split the page content to appropriate chunks
    - For embeddings/feature extraction I have used `Xenova/all-MiniLM-L6-v2'` with [Transformer.js](https://huggingface.co/docs/transformers.js/en/index)
- Storing the embeddings for a given page content
    - To solve it I have used chrome's indexedDb itself
- Latency with Summarisation API
    - To solve this I am caching the page's summarisation in memory

### The Outcome
The final product is a powerful Chrome Extension that enhances browsing by allowing users to chat with AI, ask contextual questions about webpage content, and receive multilingual summaries. Whether researching dense academic papers or navigating foreign language sites, users can interact with content effortlessly. This project bridges the gap between AI and accessibility, redefining how I interact with the web.

We’re proud of how this project can make browsing more inclusive, efficient, and intelligent, and I look forward to its potential applications in education, research, and beyond.