function StatCard({
  icon,
  title,
  value,
  description,
  linkLabel,
  onLinkClick
}) {

  return (

    <div className="stat-card">

      <div className="stat-card-top">

        <div className="stat-icon">
          {icon}
        </div>

      </div>


      <div className="stat-title">
        {title}
      </div>


      <div className="stat-value">
        {value}
      </div>


      <div className="stat-description">
        {description}
      </div>


      {linkLabel && (
        <button
          type="button"
          className="stat-card-link"
          onClick={onLinkClick}
        >
          {linkLabel}
        </button>
      )}

    </div>

  );

}


export default StatCard;