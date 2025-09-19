import Link from "next/link";

const Card = ({ title, description, image, link }) => {
  return (
    <div 
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-96 hover:shadow-xl transition-shadow duration-300"
      style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        width: '24rem',
        maxWidth: '100%',
        transition: 'box-shadow 0.3s ease'
      }}
    >
      <div className="mb-4" style={{marginBottom: '1rem'}}>
        <h2 
          className="text-xl font-semibold text-gray-800 mb-2"
          style={{fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem'}}
        >
          {title}
        </h2>
        <p 
          className="text-gray-600 text-sm leading-relaxed"
          style={{color: '#4b5563', fontSize: '0.875rem', lineHeight: '1.625'}}
        >
          {description}
        </p>
      </div>
      <div className="flex justify-end" style={{display: 'flex', justifyContent: 'flex-end'}}>
        <Link href={link || "#"}>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            Go
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Card;
