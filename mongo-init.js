// Initialize single-node replica set rs0 for Mongoose ClientSession ACID transactions
try {
  const status = rs.status();
  if (status.ok !== 1) {
    rs.initiate({
      _id: "rs0",
      members: [{ _id: 0, host: "localhost:27017" }]
    });
    print("Successfully initiated replica set rs0");
  }
} catch (e) {
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }]
  });
  print("Initiated replica set rs0 upon catch");
}
