import { Router } from "express";
import https from "node:https";
import http from "node:http";

const router = Router();

// Cache for the script to avoid repeated CDN requests
let cachedScript: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Proxy endpoint for html2pdf.js
router.get("/html2pdf.js", async (req, res) => {
  try {
    console.log("Proxy request received for html2pdf.js");
    
    // Check cache first
    const now = Date.now();
    if (cachedScript && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log("Serving from cache");
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour browser cache
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(cachedScript);
    }
    
    const url = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    
    // Use Node.js built-in modules with node: prefix
    const client = url.startsWith('https:') ? https : http;
    
    client.get(url, (response: any) => {
      console.log(`Response status: ${response.statusCode}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
       
      if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch script: ${response.statusCode}`);
      }
       
      let data = '';
      response.on('data', (chunk: any) => {
        data += chunk;
      });
       
      response.on('end', () => {
        // Cache the script
        cachedScript = data;
        cacheTimestamp = now;
        
        console.log(`Script cached, size: ${data.length} bytes`);
        
        // Set appropriate headers
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour browser cache
        res.setHeader("Access-Control-Allow-Origin", "*");
        
        res.send(data);
      });
    }).on('error', (err: any) => {
      console.error("Proxy error:", err);
      res.status(500).send("// Failed to load html2pdf.js");
    });
    
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("// Failed to load html2pdf.js");
  }
});

export default router;
