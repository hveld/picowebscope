import asyncio
import websockets 
import json
# create handler for each connection
f = open('data.json')

data_out = json.load(f)
async def handler(websocket, path):
    while True:
        data_in = await websocket.recv()
        if(data_in == "keep_alive"):
            print("KEEP ALIVE")
        else:
            print("sending data")
            #reply = f"Data recieved as:  {data}!"
            reply = json.dumps(data_out)
            await websocket.send(reply)
 
start_server = websockets.serve(handler, "localhost", 8000)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()