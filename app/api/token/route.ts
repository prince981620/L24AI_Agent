import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local')
}

const uri = process.env.MONGODB_URI;
let clientPromise: Promise<MongoClient>;

try {
  const client = new MongoClient(uri);
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    clientPromise = client.connect();
  }
} catch (error) {
  console.error('Failed to connect to MongoDB', error);
  throw new Error('Failed to connect to MongoDB');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const database = client.db(process.env.MONGODB_DB || "Lexicon");
    const tokens = database.collection("tokenList");

    // More flexible search pattern
    const token = await tokens.findOne({
      $or: [
        { symbol: { $regex: query, $options: 'i' }},
        { name: { $regex: query, $options: 'i' }}
      ]
    });

    if (!token) {
      return NextResponse.json({ 
        error: `Token not found with symbol or name containing: ${query}` 
      }, { status: 404 });
    }

    return NextResponse.json(token);
  } catch (error) {
    console.error("Database lookup error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}