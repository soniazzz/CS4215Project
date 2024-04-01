package main

import (
	"encoding/json"
	"log"
    "fmt"
	"net/http"
	"os/exec"
	"io/ioutil"
	"os"

	"github.com/rs/cors"
)

type parseRequest struct {
	Code string `json:"code"`
}

type parseResponse struct {
	ParsedCode string `json:"parsedCode"`
	Error      string `json:"error,omitempty"`
}

func parseHandler(w http.ResponseWriter, r *http.Request) {
    var req parseRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Temporarily write the code to a file
    tmpFile, err := ioutil.TempFile("", "ast-*.go")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer os.Remove(tmpFile.Name()) // Clean up the file afterwards

    // Wrap the code in a minimal valid Go file (input is just statements)
    // src := fmt.Sprintf("package p; func f() { %s }", req.Code)
    //Input is a complete program
    src := fmt.Sprintf("%s", req.Code)
    if _, err := tmpFile.WriteString(src); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    if err := tmpFile.Close(); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Execute the asty command
    outFileName := tmpFile.Name() + ".json"
    cmd := exec.Command("asty", "go2json", "-input", tmpFile.Name(), "-output", outFileName)
    if err := cmd.Run(); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer os.Remove(outFileName) // Clean up the JSON file afterwards

    // Read the JSON output
    jsonOutput, err := ioutil.ReadFile(outFileName)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Set the JSON output to the response and send it back
    response := parseResponse{
        ParsedCode: string(jsonOutput),
    }
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(response); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/parse", parseHandler)

	corsHandler := cors.Default().Handler(mux)

	log.Println("Starting server on :8080...")
	if err := http.ListenAndServe(":8080", corsHandler); err != nil {
		log.Fatal(err)
	}
}