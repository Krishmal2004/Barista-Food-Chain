# Step 1: Build the Go app
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum* ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN go build -o main .

# Step 2: Run the Go app in a lightweight container
FROM alpine:latest

WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /app/main .
COPY --from=builder /app/frontend ./frontend


# Copy the .env file
COPY --from=builder /app/.env . 

# Expose the port your Go app runs on (e.g., 8080)
EXPOSE 8080

# Command to run the executable
CMD ["./main"]