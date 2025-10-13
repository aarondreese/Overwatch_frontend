import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Link from "next/link";

import Card from "#Card";

const menuItems = [
  {
    title: "Source Systems",
    description:
      "These are the operational applications from which we collect data",
    link: "./sourcesystem",
  },
  {
    title: "Domains",
    description:
      "Domains are the business entities associated with a source system.",
    link: "./domain",
  },
  {
    title: "Distribution Groups",
    description: "Keep up to date with who should receive notifications",
    link: "./distributionGroup",
  },
  {
    title: "Schedules",
    description:
      "These are the timing engine for the DQ checks, Email Dispatch and Event monitoring.",
    link: "./schedules",
  },
  {
    title: "DQ Checks",
    description:
      "Data Quality checks monitor and validate data integrity across all systems.",
    link: "./dqchecks",
  },
  {
    title: "DQ Emails",
    description:
      "Email notifications and alerts based on data quality check results.",
    link: "./dqemails",
  },
];

export default function Home() {
  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}
    >
      <Head>
        <title>Overwatch - Data Quality Management</title>
        <meta name="description" content="Data Quality Management Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        className="container mx-auto px-4 py-8"
        style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1rem" }}
      >
        <div
          className="text-center mb-12"
          style={{ textAlign: "center", marginBottom: "3rem" }}
        >
          <h1
            className="text-4xl font-bold text-gray-800 mb-4"
            style={{
              fontSize: "2.25rem",
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "1rem",
            }}
          >
            Overwatch
          </h1>
          <p
            className="text-lg text-gray-600 max-w-2xl mx-auto"
            style={{
              fontSize: "1.125rem",
              color: "#4b5563",
              maxWidth: "42rem",
              margin: "0 auto",
            }}
          >
            Comprehensive data quality management and monitoring dashboard
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 justify-items-center"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            justifyItems: "center",
          }}
        >
          {menuItems.map((item, index) => (
            <Card key={index} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
