const fs = require('fs');
const path = require('path');
const jsdoc2md = require('jsdoc-to-markdown');
const swc = require('@swc/core');

// Directory containing the source files
const srcDir = path.join(__dirname, '..', '..', 'src');

// Output directory for the documentation
const outputDir = path.join(__dirname, 'output');

// Temporary directory for compiled JavaScript files
const tempDir = path.join(__dirname, 'temp');

// Ensure the output and temp directories exist
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
	fs.mkdirSync(tempDir, { recursive: true });
}

// Clean up old documentation files
const cleanOldDocs = (dir) => {
	if (fs.existsSync(dir)) {
		fs.readdirSync(dir).forEach(file => {
			const filePath = path.join(dir, file);
			if (fs.statSync(filePath).isDirectory()) {
				cleanOldDocs(filePath);
			} else {
				fs.unlinkSync(filePath);
			}
		});
	}
};
cleanOldDocs(outputDir);

// Function to generate documentation for a file
const generateDocs = async (filePath, relativePath) => {
	const outputFilePath = path.join(outputDir, `${relativePath}.md`);
	const outputDirPath = path.dirname(outputFilePath);

	// Ensure the output directory exists
	if (!fs.existsSync(outputDirPath)) {
		fs.mkdirSync(outputDirPath, { recursive: true });
	}

	const docs = await jsdoc2md.render({ files: `${filePath}` });
	fs.writeFileSync(outputFilePath, docs);
	console.log(`Documentation generated for ${filePath}`);
};

// Function to compile TypeScript files to JavaScript using swc
const compileTsToJs = async (filePath, relativePath) => {
	const tempFilePath = path.join(tempDir, `${relativePath}.js`);
	const tempDirPath = path.dirname(tempFilePath);

	// Ensure the temp directory exists
	if (!fs.existsSync(tempDirPath)) {
		fs.mkdirSync(tempDirPath, { recursive: true });
	}

	try {
		const { code } = await swc.transformFile(filePath, {
			jsc: {
				target: 'es2015',
				parser: { syntax: 'typescript' },
				transform: {
					react: {
						pragma: 'React.createElement',
						pragmaFrag: 'React.Fragment',
						throwIfNamespace: true,
						development: false,
						useBuiltIns: false
					}
				}
			},
			minify: false,
			sourceMaps: false,
			isModule: true,
			module: {
				type: 'commonjs',
				strict: true,
				strictMode: true,
				lazy: false,
				noInterop: false
			}
		});
		fs.writeFileSync(tempFilePath, code);
		return tempFilePath;
	} catch (err) {
		throw err;
	}
};

// Function to check if a file should be ignored
const shouldIgnoreFile = (filePath) => {
	const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
	return firstLine.trim() === '// docs-ignore';
};

// Read all files in the src directory recursively
const readDirRecursive = async (dir, relativeDir = '') => {
	const files = fs.readdirSync(dir);
	for (const file of files) {
		const filePath = path.join(dir, file);
		const relativeFilePath = path.join(relativeDir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			await readDirRecursive(filePath, relativeFilePath);
		} else if (file.endsWith('.ts') && !shouldIgnoreFile(filePath)) {
			try {
				const tempFilePath = await compileTsToJs(filePath, relativeFilePath.replace(/\.ts$/, ''));
				await generateDocs(tempFilePath, relativeFilePath.replace(/\.ts$/, ''));
				fs.unlinkSync(tempFilePath); // Clean up the temporary file
			} catch (err) {
				console.error(`Error processing ${filePath}:`, err);
			}
		}
	}
	await cleanTempDir(tempDir);
};

// Clean up temporary directory after processing
const cleanTempDir = (dir) => {
	if (fs.existsSync(dir)) {
		fs.readdirSync(dir).forEach(file => {
			const filePath = path.join(dir, file);
			if (fs.statSync(filePath).isDirectory()) {
				cleanTempDir(filePath);
			} else {
				fs.unlinkSync(filePath);
			}
		});
		fs.rmdirSync(dir);
	}
};


// Function to add the getting-started.md file
const addGettingStarted = () => {
	const content = `
  <div align="center">
	  <br />
	  <h1> Aetherial </h1>
	  <br />
	  <p>
		<a href="https://npmjs.com/package/aetherial"> <img src="https://img.shields.io/npm/v/aetherial.svg?maxAge=3600" alt="npm version" /> </a>
		<a href="https://www.npmjs.com/package/aetherial"><img src="https://img.shields.io/npm/dt/aetherial.svg?maxAge=3600" alt="npm downloads" /></a>
		<a href="https://www.npmjs.com/package/aetherial"><img src="https://img.shields.io/npm/unpacked-size/aetherial" alt="npm unpacked size" /></a>
		<a href="https://github.com/pyxelcodes/aetherial/actions"><img src="https://github.com/Pyxelcodes/aetherial/actions/workflows/eslint.yml/badge.svg" alt="Tests status" /></a>
		<a href="https://codecov.io/gh/PyxelCodes/Aetherial" ><img src="https://img.shields.io/codecov/c/github/pyxelcodes/aetherial" alt="Code coverage" /></a>
	  </p>
  </div>
  
  ## Usage
  
  You will need a token and a public key from the discord developer platform
  
  \`\`\`js
	const Aetherial = require('aetherial');
  
	const client = new Aetherial.Client(token, publicKey);
  
	client.on('ready', () => console.log('Bot is online!'))
  
	client.on('interactionCreate', (interaction) => {
		interaction.reply({
			content: "Hello, World!";
		})
	})
  \`\`\`
  
  This also works with Components
  
  \`\`\`js
	client.on('interactionCreate', (interaction) => {
	  if(interaction.isButton()) {
		interaction.reply({
			content: "Hello, World!";
		})
	  }
	})
  \`\`\`
  
  ### Using Commands
  
  Individual Command file located in \`./commands/COMMAND_NAME.js\`
  
  \`\`\`js
  module.exports = {
	  name: "hello",
	  run: ({ interaction }) => {
		  interaction.reply({ content: "Hello, World!" });
	  },
  };
  \`\`\`
  
  Using the in-built command loader which loads every command file in a subdirectory
  
  -   index.js
  -   commands
	  -   info
		  -   ping.js
  
  \`\`\`js
  Aetherial.loadCommands(client.commands);
  \`\`\`
  
  Using the in-built command registering function automatically registers the slash commands with discords API.
  
  This function should only be called when there is a change to the command name list
  Calling this once every bot start is okay but not ideal.
  
  \`\`\`js
  Aetherial.loadCommands(client.commands);
  Aetherial.registerCommands(client.commands, client.token);
  \`\`\`
  
  Running the bot locally requires a Software called ngrok.
  ngrok tunnels local http requests to a static url you can enter on the discord developer page under "INTERACTIONS ENDPOINT URL"
  
  make sure to add the /interactions at the end of the URL.
  
  for example: https://name.ngrok-free.app/interactions
  
  ### Using Embeds
  
  \`\`\`js
  interaction.reply({
	  embeds: [
		  new Aetherial.MessageEmbed()
			  .setDescription(\`This is an Embed!\`)
			  .setColor(0xff0000),
	  ],
  });
  \`\`\`
  `;

	fs.writeFileSync(path.join(outputDir, 'getting-started.md'), content);
	console.log('Added getting-started.md');
};

readDirRecursive(srcDir);
addGettingStarted();
