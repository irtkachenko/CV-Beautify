import { Router } from "express";
import https from "https";

const router = Router();

// Proxy endpoint for html2pdf.js
router.get("/html2pdf.js", async (req, res) => {
  try {
    const url = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    
    // Fetch the script from CDN
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch script: ${response.statusText}`);
    }
    
    const scriptContent = await response.text();
    
    // Set appropriate headers
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    res.send(scriptContent);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("// Failed to load html2pdf.js");
  }
});

export default router;
