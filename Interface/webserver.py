
# # for sending 1 data element at a time.
# import asyncio
# import websockets
# import json
# # create handler for each connection
# f = open('fft_data.json')

# data_out = json.load(f)
# i = 0
# print("Starting server")
# async def handler(websocket, path):
#     i = 0
#     while True:
#         data_in = await websocket.recv()
#         if (data_in == "keep_alive"):
#             print("KEEP ALIVE")
#         else:
#             print("sending data")
#             #reply = f"Data recieved as:  {data}!"
#             data = data_out["data"][i]
#             i += 1
#             if i >= len(data_out["data"]):
#                 i = 0
#             reply = json.dumps(data)
#             await websocket.send(reply)

# start_server = websockets.serve(handler, "localhost", 8000)
# asyncio.get_event_loop().run_until_complete(start_server)
# asyncio.get_event_loop().run_forever()


# for sending the whole json at once
import asyncio
import websockets
import json
# create handler for each connection
f = open('fft_data.json')

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
