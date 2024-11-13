#!/usr/bin/env python3.8
import requests
import json
import sys
import os
import wave
import boto3

from asterisk.agi import *

agi = AGI()
intent_arg = agi.get_variable('INTENT')
thread_arg = agi.get_variable('THREADID')
agi.verbose(f'INTENT: {intent_arg}', 3)
agi.verbose(f'THREADID: {thread_arg}', 3)
agi.set_variable("SHOULD_HANGUP", 0)
agi.set_variable("BOOKING_SUCCESS",0)
agi.set_variable("SHOULD_REPEAT",0)
should_repeat=0


# Define the URL and headers
url = 'http://localhost:3000/runAssistant'
headers = {
    'Content-Type': 'application/json'
}

# Define the data payload
if thread_arg == "1":
   data = {
      'sMessage': intent_arg,
  }
else:
    data = {
      'sMessage': intent_arg,
      'sThread': thread_arg
  }

agi.verbose(f'Sending post request', 3)
# Make the POST request
response = requests.post(url, headers=headers, data=json.dumps(data))

# Print the response
#agi.verbose(f'Status Code: {response.status_code}', 3)
#agi.verbose(f'Response Body: {response.text}', 3)


# Parse and print the JSON response
response_text=""
try:
    json_response = response.json()  # Parse JSON response
    agi.verbose(f'json response: {json_response}', 3)
    message=json_response.get('message')
    terminate=json_response.get('terminate')
    thread=json_response.get('thread')

    agi.verbose(f'json response message: {message}', 3)
    agi.verbose(f'json response terminate: {terminate}', 3)
    agi.verbose(f'json response threadid: {thread}', 3)
    agi.set_variable('THREADID', thread)
#    for item in json_response:
#        recipient_id = item.get('recipient_id')
#        text = item.get('text')
#        #print(f'{text}')
#        agi.set_variable('RESPONSE', text)
#        agi.verbose(f'Responce: {text}', 3)
#        response_text=text
#
    if terminate == 1:
      agi.verbose(f'The sentence ends with Bye', 3)
      agi.set_variable("BOOKING_SUCCESS", 1)
      should_repeat=0

    else:
      agi.verbose(f'The sentence does not end with Bye', 3 )
      agi.set_variable("BOOKING_SUCCESS", 0)
      should_repeat=0;

except json.JSONDecodeError:
    agi.verbose(f'Failed to decode JSON response',3)
except ValueError:
    agi.verbose(f'value error',3)


if should_repeat==0:
    agi.verbose(f'Entering into polly',3)

    #response_text="this is a test"
    #Initializing variables
    CHANNELS = 1 #Polly's output is a mono audio stream
    RATE = 8000 #Polly supports 8000Hz and 8000Hz output for PCM format
    OUTPUT_FILE_IN_WAVE = "/var/lib/asterisk/agi-bin/response.wav" #WAV format Output file  name
    FRAMES = []
    WAV_SAMPLE_WIDTH_BYTES = 2 # Polly's output is a stream of 16-bits (2 bytes) samples

    #Initializing Polly Client
    polly = boto3.client("polly")

    #Input text for conversion
    INPUT = "<speak>Hi! I'm Matthew. Hope you are doing well. This is a sample PCM to WAV conversion for SSML. I am a Neural voice and have a conversational style. </speak>" # Input in SSML

    WORD = "<speak>"
    try:
        if WORD in response_text: #Checking for SSML input
            agi.verbose(f'processing ssml',3)
            response = polly.synthesize_speech(Text=message, TextType="ssml", OutputFormat="pcm",VoiceId="Joanna", SampleRate="8000") #the input to sampleRate is a string value.
        else:
            agi.verbose(f'processing text',3)
            response = polly.synthesize_speech(Text=message, TextType="text", OutputFormat="pcm",VoiceId="Joanna", SampleRate="8000")
    except (BotoCoreError, ClientError) as error:
        sys.exit(-1)

    #Processing the response to audio stream
    STREAM = response.get("AudioStream")
    FRAMES.append(STREAM.read())

    WAVEFORMAT = wave.open(OUTPUT_FILE_IN_WAVE,'wb')
    WAVEFORMAT.setnchannels(CHANNELS)
    WAVEFORMAT.setsampwidth(WAV_SAMPLE_WIDTH_BYTES)
    WAVEFORMAT.setframerate(RATE)
    WAVEFORMAT.writeframes(b''.join(FRAMES))
    WAVEFORMAT.close()
