# Usage:
# Run interactively:
# ./run sh
# ./run "python server"

docker run \
  --interactive \
  --tty \
  --rm \
  --name dancecam \
  --volume $(pwd):/app/checkout \
  --workdir /app/checkout \
  -p 8765:8765 \
  dancecam-image \
  python /app/checkout/server.py
