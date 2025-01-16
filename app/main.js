const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion() {
  rl.question("$ ", (answer) => {
    if (answer === 'exit 0') {
      rl.close();
      return;
    };
    if (!answer.startsWith('echo ')) {
      console.log(`${answer}: command not found`);
    }
    else {
      let result = answer.slice(5);
      console.log(result);
    }
    askQuestion();
  });
};


askQuestion();