const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const supportedTypes = ['type', 'echo', 'exit'];

const handleEcho = (answer) => {
  let result = answer.slice(5);
  console.log(result);
}

const handleType = (answer) => {
  let command = answer.slice(5);

  // console.log(process.env.PATH);
  if (supportedTypes.indexOf(command) > -1) {
    console.log(`${command} is a shell builtin`);
    return;
  }

  const pathDirs = process.env.PATH.split(";");
  for(const dir of pathDirs) {
    const filePath = path.join(dir, command);

    if(fs.existsSync(filePath)) {
      try {
        fs.accessSync(filePath, fs.constants.X_OK);
        console.log(`${command} is ${filePath}`);
        return;
      } catch {
        continue;
      }
    }
  }
  console.log(`${command}: not found`);
}

const main = () => {
  // console.log(process.argv);
  rl.question('$ ', (answer) => {
    if (answer === 'exit 0') {
      rl.close();
      return;
    }

    if (answer.startsWith('echo ')) {
      handleEcho(answer);
    }
    else if (answer.startsWith('type ')) {
      handleType(answer);
    }
    else {
      console.log(`${answer}: command not found`);
    }
    main();
  });
}

main();