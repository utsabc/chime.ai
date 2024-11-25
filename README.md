# <img src="public/icons/icon_48.png" width="45" align="left"> chime.ai

chime.ai is a Chrome extension that provides a chat assistant for webpages. It can summarize page content, answer questions about the page, and support multiple languages for chat and summaries.

## Features

### 1. Contextual AI Chat
- **Description**: Allows users to chat with an AI assistant about the content of the current webpage.
- **Key Capabilities**:
  - Utilizes the **Prompt API** to create dynamic and relevant user prompts based on webpage content.
  - Extracts the necessary context from the webpage to ensure conversations are meaningful and tailored.
  - Provides responses that adapt dynamically to user input and the current content of the webpage.

### 2. Multilingual Chat Support
- **Description**: Facilitates seamless communication across languages by detecting the language of user input.
- **Key Capabilities**:
  - Detects the language of the user's input using the **Language Detection API**.
  - Responds in the same language as the user's input.
  - Works fluently with non-English webpage content, maintaining language consistency throughout interactions using **Translation API**.

### 3. Content Summarization
- **Description**: Generates concise summaries of the current webpage content for easy comprehension.
- **Key Capabilities**:
  - Utilizes the **Summarization API** to distill complex information into clear and concise insights.
  - Allows users to choose the language for the summary, making it accessible to global users.
  - Handles non-English webpages effectively, generating accurate multilingual summaries.

### 4. Interactive Multilingual Summarization
- **Description**: Enhances accessibility by offering real-time language translation for summaries.
- **Key Capabilities**:
  - Users can select a preferred language for viewing the summary.
  - Ensures accessibility for non-native readers.

### 5. Non-English Webpage Support
- **Description**: Fully supports webpages in various languages for a seamless multilingual experience.
- **Key Capabilities**:
  - Leverages the **Translation API** for seamless adaptation to different languages.
  - Ensures that summaries, prompts, and chats respect the original language of the content.


## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/g-chime.git
   cd g-chime
   ```

2. Install dependencies:
    ```sh
    npm install
    ```
3. Build the extension:
    ```sh
    npm run build
    ```
4. Load the extension in Chrome:

    Open Chrome and go to chrome://extensions/
    Enable "Developer mode"
    Click "Load unpacked" and select the build directory

## Usage

- Click on the G Chime icon in the Chrome toolbar to open the side panel.
- Use the chat input to ask questions about the current webpage. 
- Click the "Summarize Page" button to generate a summary of the page content.
- Select a language from the dropdown to get the summary in that language.

## Development

### Scripts

- npm run watch: Build the extension in development mode and watch for changes.
- npm run build: Build the extension in production mode.
- npm run pack: Package the extension into a zip file for distribution.
- npm run repack: Build and package the extension.
- npm run format: Format the code using Prettier.

### File Structure

- `src/`: Source code for the extension
    - `lib/`: Library files
        - `chatManager.js`: Manages chat interactions and summarization
        - `featureExtractor.js`: Extracts features from text
        - `nano.js`: Handles AI interactions
        - `extractContent.js`: Splits and processes page content
    - `sidepanel.js`: Main script for the side panel
    - `sidepanel.css`: Styles for the side panel
    - `content.js`: Content script for extracting page content
- `public/`: Static assets and manifest
    - `icons/`: Extension icons
    - `manifest.json`: Extension manifest file
    - `sidepanel.html`: HTML for the side panel
- `config/`: Webpack configuration files
- `build/`: Output directory for the built extension
- `release/`: Directory for packaged extension files

## Adding New Languages
To add support for a new language:

1. Update the SUPPORTED_LANGUAGES array in src/lib/nano.js.
2. Add the language option in the language-select dropdown in public/sidepanel.html.