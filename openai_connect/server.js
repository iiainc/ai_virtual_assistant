// Import necessary libraries
const express = require('express'); // Express framework for building web applications
const app = express(); // Initialize an Express application
const port = 3000; // Define the port number on which the server will listen


const ASSISTANT_NAME = "table-book";
// Load environment variables from the .env file
require('dotenv').config();

// Middleware to parse JSON bodies in requests
app.use(express.json());
// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({
  extended: true
}));


// Import the OpenAI library
const OpenAI = require('openai');
// Create an OpenAI client with the API key from the .env file
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], 
});

global.terminate=0;

global.process_booking= function process_booking() {
    global.terminate=1;
    return "success";
}




// Define a route for the root URL '/'
app.get('/', (req, res) => {
  res.send('Hello World!'); // Send a response when the root URL is accessed
});



app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Define an endpoint to create a new assistant
app.post('/getAssistant', async(req, res) => {
  // Use the OpenAI API to get an assistant
  let assistants = await openai.beta.assistants.list();
  assistant = assistants.data.find(assistant => assistant.name == ASSISTANT_NAME);	
  res.send(assistant); // Send the created assistant object as a response
});

// Add an endpoint to run the assistant
app.post('/runAssistant', async (req, res) => {
  let body = req.body; // Get the request body
  let sThread = '';
  global.terminate=0;

  // Check if it's a new conversation or an existing thread
  if (!body.sThread) {
    let oThread = await openai.beta.threads.create();
    sThread = oThread.id;
  }else {
    sThread = body.sThread;  
  }
  console.log(`thread id ${sThread}`);

  // Add a message to the thread
  await openai.beta.threads.messages.create(sThread, {
    role: 'user',
    content: body.sMessage
  });

  // Run the assistant with the provided thread
  let run = await openai.beta.threads.runs.create(sThread, {
    assistant_id: "<assistant_id>"
  });

  // Wait for the run to complete
  await waitForRunComplete(sThread, run.id);

  // Retrieve messages from the thread
  const threadMessages = await openai.beta.threads.messages.list(sThread);

  // Send the thread messages and thread ID as a response
  res.send({
    message : threadMessages.body.data[0].content[0].text.value,
    thread : sThread,
    terminate: global.terminate	  
  });
});

// Define a function to wait for a run to complete
async function waitForRunComplete (sThreadId, sRunId) {
  while (true) {
    const oRun = await openai.beta.threads.runs.retrieve(sThreadId, sRunId);
    if (oRun.status && (oRun.status === 'completed' || oRun.status === 'failed' )) {
      console.log(oRun.status);    
      break; // Exit loop if run is completed, failed, or requires action
    }
    if( oRun.status === 'requires_action') {
	    const toolCalls =
                oRun.required_action.submit_tool_outputs.tool_calls;
              const toolOutputs = [];

              for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;

                console.log(`This question requires us to call a function: ${functionName}`);
		  console.log(`This question requires to call question with args: ${toolCall.function.arguments}`);
		 // const args = JSON.parse(toolCall.function.arguments);

               // const argsArray = Object.keys(args).map((key) => args[key]);

                // Dynamically call the function with arguments
                const output = await global[functionName].apply(null, []);

                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: output,
                });
              }
              // Submit tool outputs
              await openai.beta.threads.runs.submitToolOutputs(
                sThreadId,
                sRunId,
                { tool_outputs: toolOutputs }
              );
              continue; // Continue polling for the final response


   }	
    // Delay the next check to avoid high frequency polling
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
  }
}



// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
