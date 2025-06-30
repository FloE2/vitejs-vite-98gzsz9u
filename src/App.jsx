// Fonction pour obtenir le niveau à partir de la classe
const getLevel = (className) => {
  if (className.startsWith('6')) return '6ème';
  if (className.startsWith('5')) return '5ème';
  if (className.startsWith('4')) return '4ème';
  if (className.startsWith('3')) return '3ème';
  return 'Autre';
};

// Calculer le score sur 100
const calculateScore = (value, test, student) => {
  const age = new Date().getFullYear() - new Date(student.birthDate).getFullYear();
  const baseScore = test.reverse ? Math.max(0, 100 - value * 2) : Math.min(100, value / 2);
  const ageAdjustment = (age - 12) * 2;
  const genderAdjustment = student.gender === 'F' ? 5 : 0;
  
  return Math.min(100, Math.max(0, baseScore + ageAdjustment + genderAdjustment));
};