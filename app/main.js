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

// const handleRedirection = (args) => {
//   const operatorIdx = args.findIndex(arg => arg === '>' || arg === '1>' || arg === '2>' || arg === '>>' || arg === '1>>' || arg === '2>>');

//   const operator = args[operatorIdx];
//   const commandParts = args.slice(0, operatorIdx);
//   const command = commandParts.join(' ');
//   const outputFile = args[operatorIdx + 1];
//   const directory = path.dirname(outputFile);

//   if(directory && directory !== '.' && !fs.existsSync(directory)) {
//     try {
//       fs.mkdirSync(directory, { recursive: true });
//     } catch (err) {
//       console.error(`Failed to create directory: ${directory}`, err);
//       return;
//     }
//   }

//   const isAppending = operator.includes('>>');
//   // const writeMethod = isAppending ? fs.appendFileSync : fs.writeFileSync;
//   const flags = isAppending ? {flag: 'a'} : {flag: 'w'};

//   if (operator === '>' || operator === '1>' || operator === '>>' || operator === '1>>') {
//     try {
//       const output = execSync(command, {
//         encoding: 'utf-8',
//         stdio: ['pipe', 'pipe', 'pipe']
//       });
//       fs.writeFileSync(outputFile, output, flags);
//     } catch (error) {
//       if (error.stdout) {
//         fs.writeFileSync(outputFile, error.stdout.toString(), flags);
//       }
//       else if (!isAppending) {
//         fs.writeFileSync(outputFile, '', {flag: 'w'});
//       }
//     }
//   }
//   else if (operator === '2>' || operator === '2>>') {
//     try {
//       execSync(command, {
//         encoding: 'utf-8',
//         stdio: ['pipe', 'pipe', 'pipe']
//       });
      
//       if (!isAppending && commandParts[0] !== 'echo') {
//         fs.writeFileSync(outputFile, '', {flag: 'w'});
//         // writeMethod(outputFile, output);
//       }
//       // else if (!isAppending) {
//       //   writeMethod(outputFile, '');
//       // }
//     } catch (error) {
//       if (error.stderr) {
//         fs.writeFileSync(outputFile, error.stderr.toString(), flags);
//       }
//       else if (!isAppending){
//         fs.writeFileSync(outputFile, '', {flag: 'w'});
//       }
//     }
//   }
// }



const handleRedirection = (args) => {
  const operatorIdx = args.findIndex(arg => arg === '>' || arg === '1>' || arg === '2>' || arg === '>>' || arg === '1>>' || arg === '2>>');

  const operator = args[operatorIdx];
  const commandParts = args.slice(0, operatorIdx);
  const command = commandParts.join(' ');
  const outputFile = args[operatorIdx + 1];
  const directory = path.dirname(outputFile);

  // Create directory if it doesn't exist
  try {
    if (directory && directory !== '.') {
      fs.mkdirSync(directory, { recursive: true });
    }
  } catch (err) {
    console.error(`Error creating directory: ${err.message}`);
  }

  const isAppending = operator.includes('>>');
  
  // Special case for echo with stderr redirection
  if ((operator === '2>' || operator === '2>>') && commandParts[0] === 'echo') {
    try {
      const echoOutput = execSync(command, { encoding: 'utf8' });
      if (isAppending) {
        fs.appendFileSync(outputFile, echoOutput);
      } else {
        fs.writeFileSync(outputFile, echoOutput);
      }
    } catch (error) {
      // Unlikely for echo to fail, but handle it anyway
      if (error.stdout) {
        if (isAppending) {
          fs.appendFileSync(outputFile, error.stdout);
        } else {
          fs.writeFileSync(outputFile, error.stdout);
        }
      }
    }
    return;
  }
  
  if (operator === '>' || operator === '1>' || operator === '>>' || operator === '1>>') {
    // Handle stdout redirection
    try {
      const output = execSync(command, {
        encoding: 'utf-8'
      });
      
      if (isAppending) {
        fs.appendFileSync(outputFile, output);
      } else {
        fs.writeFileSync(outputFile, output);
      }
    } catch (error) {
      // For non-appending operations, create empty file by default
      if (!isAppending) {
        fs.writeFileSync(outputFile, '');
      }
      
      // Write stdout if available (command might still produce stdout even when failing)
      if (error.stdout) {
        if (isAppending) {
          fs.appendFileSync(outputFile, error.stdout);
        } else {
          fs.writeFileSync(outputFile, error.stdout);
        }
      }
    }
  } else if (operator === '2>' || operator === '2>>') {
    // Handle stderr redirection
    try {
      execSync(command, {
        encoding: 'utf-8'
      });
      
      // Command succeeded with no stderr, write empty file if not appending
      if (!isAppending) {
        fs.writeFileSync(outputFile, '');
      }
    } catch (error) {
      // Command failed, capture stderr
      if (error.stderr) {
        if (isAppending) {
          fs.appendFileSync(outputFile, error.stderr);
        } else {
          fs.writeFileSync(outputFile, error.stderr);
        }
      } else if (!isAppending) {
        fs.writeFileSync(outputFile, '');
      }
    }
  }
};



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