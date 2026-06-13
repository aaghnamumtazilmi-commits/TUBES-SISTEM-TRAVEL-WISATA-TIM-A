const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");

const PORT = process.env.PORT || 4000;

// Upstream service URLs
const PACKAGE_SERVICE_URL =
  process.env.PACKAGE_SERVICE_URL || "http://package-service:3001";
const BOOKING_SERVICE_URL =
  process.env.BOOKING_SERVICE_URL || "http://booking-service:3002";
const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://analytics-service:5000";
const REVIEW_SERVICE_URL =
  process.env.REVIEW_SERVICE_URL || "http://review-service:8003";

// ─── Helper: fetch JSON from upstream ────────────────────────────────────────
async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.message || `Upstream error: HTTP ${response.status}`);
  }

  return body;
}

// ─── Type Definitions ────────────────────────────────────────────────────────
const typeDefs = `#graphql

  # ── Package Service ──────────────────────────────────────────────────────────
  type Package {
    id: Int!
    nama_paket: String!
    destinasi: String!
    durasi: String!
    harga: Int!
    deskripsi: String
    transportasi: String
    akomodasi: String
    tersedia: Boolean
    created_at: String
  }

  input CreatePackageInput {
    nama_paket: String!
    destinasi: String!
    durasi: String!
    harga: Int!
    deskripsi: String
    transportasi: String
    akomodasi: String
  }

  input UpdatePackageInput {
    nama_paket: String!
    destinasi: String!
    durasi: String!
    harga: Int!
    deskripsi: String
    transportasi: String
    akomodasi: String
    tersedia: Boolean
  }

  # ── Booking Service ─────────────────────────────────────────────────────────
  type PackageSnapshot {
    id: Int
    nama_paket: String
    harga: Int
  }

  type Booking {
    _id: String!
    nama_pelanggan: String!
    nomor_telepon: String!
    package_id: Int!
    jumlah_peserta: Int!
    package_snapshot: PackageSnapshot
    total_harga: Int!
    status: String!
    createdAt: String
    updatedAt: String
  }

  input CreateBookingInput {
    nama_pelanggan: String!
    nomor_telepon: String!
    package_id: Int!
    jumlah_peserta: Int!
  }

  # ── Analytics Service ───────────────────────────────────────────────────────
  type AnalyticsSummaryData {
    total_packages: Int
  }

  type AnalyticsSummary {
    service: String
    summary: AnalyticsSummaryData
  }

  # ── Review Service ──────────────────────────────────────────────────────────
  type Review {
    id: Int!
    destination_id: Int!
    user_name: String!
    rating: Int!
    comment: String!
    created_at: String
    updated_at: String
  }

  type ReviewsByDestination {
    destination_id: Int!
    average_rating: Float
    total_reviews: Int
    data: [Review!]!
  }

  input CreateReviewInput {
    destination_id: Int!
    user_name: String!
    rating: Int!
    comment: String!
  }

  input UpdateReviewInput {
    destination_id: Int
    user_name: String
    rating: Int
    comment: String
  }

  # ── Health ──────────────────────────────────────────────────────────────────
  type ServiceHealth {
    service: String
    status: String
    database: String
  }

  # ── Root Types ──────────────────────────────────────────────────────────────
  type Query {
    # Package
    packages: [Package!]!
    package(id: Int!): Package
    searchPackages(destinasi: String!): [Package!]!

    # Booking
    bookings: [Booking!]!
    booking(id: String!): Booking

    # Analytics
    analyticsSummary: AnalyticsSummary

    # Review
    reviews: [Review!]!
    review(id: Int!): Review
    reviewsByDestination(destination_id: Int!): ReviewsByDestination

    # Health
    packageServiceHealth: ServiceHealth
    bookingServiceHealth: ServiceHealth
    analyticsServiceHealth: ServiceHealth
    reviewServiceHealth: ServiceHealth
  }

  type Mutation {
    # Package
    createPackage(input: CreatePackageInput!): Package
    updatePackage(id: Int!, input: UpdatePackageInput!): String
    deletePackage(id: Int!): String

    # Booking
    createBooking(input: CreateBookingInput!): Booking
    updateBookingStatus(id: String!, status: String!): Booking
    deleteBooking(id: String!): String

    # Review
    createReview(input: CreateReviewInput!): Review
    updateReview(id: Int!, input: UpdateReviewInput!): Review
    deleteReview(id: Int!): String
  }
`;

// ─── Resolvers ───────────────────────────────────────────────────────────────
const resolvers = {
  Query: {
    /* ── Package ─────────────────────────────────────── */
    packages: async () => {
      const res = await fetchJSON(`${PACKAGE_SERVICE_URL}/packages`);
      return res.data;
    },

    package: async (_, { id }) => {
      const res = await fetchJSON(`${PACKAGE_SERVICE_URL}/packages/${id}`);
      return res.data;
    },

    searchPackages: async (_, { destinasi }) => {
      const res = await fetchJSON(
        `${PACKAGE_SERVICE_URL}/packages/search?destinasi=${encodeURIComponent(destinasi)}`
      );
      return res.data;
    },

    /* ── Booking ─────────────────────────────────────── */
    bookings: async () => {
      const res = await fetchJSON(`${BOOKING_SERVICE_URL}/bookings`);
      return res.data;
    },

    booking: async (_, { id }) => {
      const res = await fetchJSON(`${BOOKING_SERVICE_URL}/bookings/${id}`);
      return res.data;
    },

    /* ── Analytics ───────────────────────────────────── */
    analyticsSummary: async () => {
      const res = await fetchJSON(
        `${ANALYTICS_SERVICE_URL}/analytics/summary`
      );
      return res;
    },

    /* ── Review ──────────────────────────────────────── */
    reviews: async () => {
      const res = await fetchJSON(`${REVIEW_SERVICE_URL}/reviews`);
      return res.data;
    },

    review: async (_, { id }) => {
      const res = await fetchJSON(`${REVIEW_SERVICE_URL}/reviews/${id}`);
      return res.data;
    },

    reviewsByDestination: async (_, { destination_id }) => {
      const res = await fetchJSON(
        `${REVIEW_SERVICE_URL}/reviews/destination/${destination_id}`
      );
      return {
        destination_id: res.destination_id,
        average_rating: res.average_rating,
        total_reviews: res.total_reviews,
        data: res.data,
      };
    },

    /* ── Health ──────────────────────────────────────── */
    packageServiceHealth: async () => {
      return await fetchJSON(`${PACKAGE_SERVICE_URL}/health`);
    },

    bookingServiceHealth: async () => {
      return await fetchJSON(`${BOOKING_SERVICE_URL}/health`);
    },

    analyticsServiceHealth: async () => {
      return await fetchJSON(`${ANALYTICS_SERVICE_URL}/health`);
    },

    reviewServiceHealth: async () => {
      return await fetchJSON(`${REVIEW_SERVICE_URL}/health`);
    },
  },

  Mutation: {
    /* ── Package ─────────────────────────────────────── */
    createPackage: async (_, { input }) => {
      const res = await fetchJSON(`${PACKAGE_SERVICE_URL}/packages`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },

    updatePackage: async (_, { id, input }) => {
      const res = await fetchJSON(`${PACKAGE_SERVICE_URL}/packages/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
      return res.message;
    },

    deletePackage: async (_, { id }) => {
      const res = await fetchJSON(`${PACKAGE_SERVICE_URL}/packages/${id}`, {
        method: "DELETE",
      });
      return res.message;
    },

    /* ── Booking ─────────────────────────────────────── */
    createBooking: async (_, { input }) => {
      const res = await fetchJSON(`${BOOKING_SERVICE_URL}/bookings`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },

    updateBookingStatus: async (_, { id, status }) => {
      const res = await fetchJSON(
        `${BOOKING_SERVICE_URL}/bookings/${id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );
      return res.data;
    },

    deleteBooking: async (_, { id }) => {
      const res = await fetchJSON(`${BOOKING_SERVICE_URL}/bookings/${id}`, {
        method: "DELETE",
      });
      return res.message;
    },

    /* ── Review ──────────────────────────────────────── */
    createReview: async (_, { input }) => {
      const res = await fetchJSON(`${REVIEW_SERVICE_URL}/reviews`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },

    updateReview: async (_, { id, input }) => {
      const res = await fetchJSON(`${REVIEW_SERVICE_URL}/reviews/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
      return res.data;
    },

    deleteReview: async (_, { id }) => {
      const res = await fetchJSON(`${REVIEW_SERVICE_URL}/reviews/${id}`, {
        method: "DELETE",
      });
      return res.message;
    },
  },
};

// ─── Start Server ────────────────────────────────────────────────────────────
async function startServer() {
  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
  });

  console.log(`GraphQL Gateway berjalan pada ${url}`);
}

startServer();
