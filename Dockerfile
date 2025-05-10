FROM node:18

# Install OS-level dependencies needed for canvas
RUN apt-get update && apt-get install -y \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Create and set app directory
WORKDIR /app

# Copy everything
COPY . .

# Install dependencies (including canvas)
RUN npm install

# Expose your app’s port (default 10000)
EXPOSE 10000

# Start your app
CMD ["node", "index.js"]
