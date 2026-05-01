export  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(num);
  };
