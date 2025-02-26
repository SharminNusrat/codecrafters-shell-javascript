const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execFileSync, execSync, exec } = require("child_process");
const os = require('os');
const { stderr } = require("process");

const pathDirs = process.env.PATH.split(path.delimiter);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const supportedTypes = ['type', 'echo', 'pwd', 'cd', 'exit'];

const parseInput = (answer) => {
  let currentArg = "";
  let args = [];
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let escaped = false;

  const singleQuote = "'";
  const doubleQuote = '"';

  for (let i = 0; i < answer.length; i++) {
    const char = answer[i];

    if (escaped) {
      if (inDoubleQuotes) {
        if (char === '$' || char === '"' || char === '\\') {
          currentArg += char;
        } else {
          currentArg += '\\' + char;
        }
      } else if (inSingleQuotes) {
        currentArg += '\\' + char;
      } else {
        currentArg += char;
      }
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === singleQuote && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
    } else if (char === doubleQuote && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
    } else if (char === ' ' && !inSingleQuotes && !inDoubleQuotes) {
      if (currentArg.length) {
        args.push(currentArg);
        currentArg = "";
      }
    } else {
      currentArg += char;
    }
  }

  if (currentArg.length) {
    args.push(currentArg);
  }

  if (inSingleQuotes) {
    throw new Error("Unmatched single quote.");
  }
  if (inDoubleQuotes) {
    throw new Error("Unmatched double quote.");
  }

  return args;
};

const handleEcho = (args) => {
  let result = args.join(" ");
  console.log(result);
}

const handleType = (answer) => {
  let command = answer.slice(5);

  if (supportedTypes.indexOf(command) > -1) {
    console.log(`${command} is a shell builtin`);
    return;
  }

  for (const dir of pathDirs) {
    const filePath = path.join(dir, command);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      try {
        console.log(`${command} is ${filePath}`);
        return;
      } catch {
        continue;
      }
    }
  }
  console.log(`${command}: not found`);
}

const handlePwd = (answer) => {
  if (answer === 'pwd') {
    console.log(process.cwd());
  }
  else {
    console.log(`${answer}: command not found`);
  }
}

const handleCd = (answer) => {
  let dir = answer.slice(3);
  if (dir === '~') {
    dir = os.homedir();
  }

  try {
    process.chdir(dir);
  } catch (err) {
    console.log(`cd: ${dir}: No such file or directory`);
  }
}

const handleRedirection = (args) => {
  const operatorIdx = args.findIndex(arg => arg === '>' || arg === '1>' || arg === '2>' || arg === '>>' || arg === '1>>' || arg === '2>>');

  const operator = args[operatorIdx]; 
  const commandParts = args.slice(0, operatorIdx);
  const command = commandParts.join(' ');
  const outputFile = args[operatorIdx + 1];
  const directory = path.dirname(outputFile);

  fs.mkdirSync(directory, {recursive: true});

  const isAppending = operator.includes('>>');
  const writeMethod = isAppending ? fs.appendFileSync : fs.writeFileSync;

  if(operator === '>' || operator === '1>' || operator === '>>' || operator === '1>>') {
    try {
      const output = execSync(command, {
        encoding: 'utf-8'
      });
      writeMethod(outputFile, output);
    } catch(error) {
      if(error.stdout) {
        writeMethod(outputFile, error.stdout.toString());
      }
      else if(isAppending) {}
      else {
        writeMethod(outputFile, '');
      }
    }
  }
  else if(operator === '2>' || operator === '2>>') {
    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'inherit', 'pipe']
      });

      if(commandParts[0] === 'echo') {
        writeMethod(outputFile, output);
      } 
      else if(!isAppending){
        writeMethod(outputFile, '');
      }
    } catch(error) {
      if(error.stderr) {
        writeMethod(outputFile, error.stderr.toString());
      }
      else if(isAppending) {}
      else {
        writeMethod(outputFile, '');
      }
    }
  } 
}

const runProgram = (answer, args) => {
  const program = args.shift();
  let found = false;

  for (const dir of pathDirs) {
    const filePath = program;

    try {
      const stdout = execFileSync(filePath, args, {
        stdio: 'pipe',
        encoding: 'utf8',
      });

      process.stdout.write(stdout);
      found = true;
      return;
    } catch {
      continue;
    }
  }

  if (!found) console.log(`${answer}: command not found`);
}

const main = () => {
  rl.question('$ ', (answer) => {
    if (answer === 'exit 0') {
      rl.close();
      return;
    }
    let args = [];
    args = parseInput(answer);

    if (args.includes('>') || args.includes('1>') || args.includes('2>') || args.includes('>>') || args.includes('1>>') || args.includes('2>>')) {
      handleRedirection(args);
    }
    else if (answer.startsWith('echo ')) {
      args.shift();
      handleEcho(args);
    }
    else if (answer.startsWith('type ')) {
      handleType(answer);
    }
    else if (answer.startsWith('pwd')) {
      handlePwd(answer);
    }
    else if (answer.startsWith('cd ')) {
      handleCd(answer);
    }
    else {
      runProgram(answer, args);
    }
    main();
  });
}

main();