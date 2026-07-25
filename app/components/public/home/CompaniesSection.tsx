import companyList from '@/app/lib/constants/home/companyList'

const CompaniesSection = () => {
  return (
    <section className="w-full bg-slate-900 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Text */}
        <div className="text-center mb-12">
          <h2 className="text-xl md:text-2xl text-white font-medium">
            Trusted by <span className="text-blue-400 font-semibold">14+</span> teams, agencies and freelancers.
          </h2>
        </div>

        {/* Company Logos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-12 items-center">
          {companyList.map((company, index) => (
            <div key={index} className="text-white text-lg md:text-xl font-semibold text-center">
              {company.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CompaniesSection
