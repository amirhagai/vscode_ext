import sys
import json
import logging

# Configure logging to a file
log_file = '/home/amir/Desktop/my-python-extension/backend.log'
logging.basicConfig(filename=log_file, level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

logging.info("Backend script started.")

def main():
    logging.info("Main function entered. Waiting for stdin.")
    for line in sys.stdin:
        logging.info(f"Received line: {line.strip()}")
        try:
            request = json.loads(line)
            logging.debug(f"Parsed request: {request}")
            method = request.get("method")

            if method == "say_hello":
                name = request.get("params", {}).get("name", "World")
                response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id"),
                    "result": f"Hello, {name}!"
                }
                logging.info(f"Sending response: {response}")
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
                logging.info("Response sent and flushed.")

        except Exception as e:
            logging.error(f"Error processing request: {e}", exc_info=True)
            sys.stderr.write(f"Error processing request: {e}\n")
            sys.stderr.flush()
    logging.info("Exiting main loop.")

if __name__ == "__main__":
    logging.info("Script executed as main.")
    main()
    logging.info("Main function finished. Script terminating.")

