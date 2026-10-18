// Configuration for migrate-mongo database migration runner
module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/bebsayik_dev?replicaSet=rs0",
    databaseName: process.env.MONGODB_DB_NAME || "bebsayik_dev",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: 'commonjs'
};
