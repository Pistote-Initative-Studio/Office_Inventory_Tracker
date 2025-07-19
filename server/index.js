const express = require('express');
const cors = require('cors');
// Import inventory routes
const inventoryRoutes = require('./routes/inventory');

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON bodies

// Mount the inventory API routes
app.use('/inventory', inventoryRoutes);

const PORT = 5000;

app.get('/', (req, res) => {
  res.send('Office Inventory Backend Running');
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
