package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	initDB()
	defer dbPool.Close()

	http.HandleFunc("/api/reviews", createReviewHandler)
	fs := http.FileServer(http.Dir("./frontend"))
	http.Handle("/", fs)
	fmt.Println("Server is running on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}