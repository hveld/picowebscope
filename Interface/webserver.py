# script for sending data to the interface to easily test if it is working.
import asyncio
import websockets
import json

# change this line if other data is needed.
# eg. for the fft data change this to: small_fft_data.json
f = open('small_scope_data.json')

data_out = json.load(f)


async def handler(websocket, path):
    while True:
        data_in = await websocket.recv()
        if (data_in == "keep_alive"):
            print("KEEP ALIVE")
        else:
            print("sending data")
            #reply = f"Data recieved as:  {data}!"
            reply = json.dumps(data_out)
            await websocket.send(reply)

start_server = websockets.serve(handler, "localhost", 8000)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
