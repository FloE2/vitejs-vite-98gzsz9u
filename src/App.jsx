import React, { useState, useEffect } from 'react';
import { User, Users, FileText, BarChart3, Download, RefreshCw, LogOut, Plus, Trash2, Edit, Save, X, Loader } from 'lucide-react';
import { db } from './firebase';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';

// Configuration sécurité admin
const ADMIN_EMAILS = [
  "florianeude@gmail.com",
  "cosperecemeric@gmail.com"
];
const googleProvider = new GoogleAuthProvider();

const checkIfAdmin = (userEmail) => {
  return ADMIN_EMAILS.includes(userEmail?.toLowerCase());
};

const App = () => {
  // États principaux
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tests');
  const [loading, setLoading] = useState(true);
  const [editingTest, setEditingTest] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // États Firebase
  const [testCategories, setTestCategories] = useState({
    vitesse: [],
    endurance: [],
    saut: [],
    lancer: [],
    force: [],
    souplesse: [],
    equilibre: []
  });
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [results, setResults] = useState([]);

  // États pour les formulaires
  const [newTest, setNewTest] = useState({ category: 'vitesse', name: '', unit: '', reverse: false });
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', birthDate: '', gender: 'M', class: '6A' });
  const [newResult, setNewResult] = useState({ studentId: '', testId: '', value: '', date: new Date().toISOString().split('T')[0] });

  // Charger les données depuis Firebase au démarrage
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadClasses(),
        loadStudents(),
        loadTestCategories(),
        loadResults()
      ]);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les classes
  const loadClasses = async () => {
    try {
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      const classesData = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(classesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Erreur chargement classes:', error);
    }
  };

  // Charger les élèves
  const loadStudents = async () => {
    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Erreur chargement élèves:', error);
    }
  };

  // Charger les catégories de tests
  const loadTestCategories = async () => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'sportCategories'));
      const categories = {
        vitesse: [],
        endurance: [],
        saut: [],
        lancer: [],
        force: [],
        souplesse: [],
        equilibre: []
      };
      
      categoriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (categories[data.category]) {
          categories[data.category].push({
            id: doc.id,
            ...data
          });
        }
      });
      
      setTestCategories(categories);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  // Charger les résultats
  const loadResults = async () => {
    try {
      const resultsSnapshot = await getDocs(collection(db, 'results'));
      const resultsData = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResults(resultsData);
    } catch (error) {
      console.error('Erreur chargement résultats:', error);
    }
  };

  // Ajouter un test
  const addTest = async () => {
    if (!newTest.name.trim()) return;
    
    try {
      await addDoc(collection(db, 'sportCategories'), {
        category: newTest.category,
        name: newTest.name,
        unit: newTest.unit,
        reverse: newTest.reverse,
        createdAt: new Date()
      });
      
      setNewTest({ category: 'vitesse', name: '', unit: '', reverse: false });
      await loadTestCategories();
    } catch (error) {
      console.error('Erreur ajout test:', error);
    }
  };

  // Supprimer un test
  const deleteTest = async (testId) => {
    try {
      await deleteDoc(doc(db, 'sportCategories', testId));
      await loadTestCategories();
    } catch (error) {
      console.error('Erreur suppression test:', error);
    }
  };

  // Générer identifiant élève
  const generateStudentId = (firstName, lastName) => {
    return `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
  };

  // Ajouter un élève
  const addStudent = async () => {
    if (!newStudent.firstName.trim() || !newStudent.lastName.trim()) return;
    
    const username = generateStudentId(newStudent.firstName, newStudent.lastName);
    const password = `${newStudent.firstName.toLowerCase()}123`;
    
    try {
      await addDoc(collection(db, 'students'), {
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        birthDate: newStudent.birthDate,
        gender: newStudent.gender,
        class: newStudent.class,
        username,
        password,
        createdAt: new Date()
      });
      
      setNewStudent({ firstName: '', lastName: '', birthDate: '', gender: 'M', class: '6A' });
      await loadStudents();
    } catch (error) {
      console.error('Erreur ajout élève:', error);
    }
  };

  // Modifier un élève
  const updateStudent = async (studentId, updatedData) => {
    try {
      // Régénérer l'identifiant si prénom ou nom ont changé
      const username = generateStudentId(updatedData.firstName, updatedData.lastName);
      
      await updateDoc(doc(db, 'students', studentId), {
        ...updatedData,
        username,
        updatedAt: new Date()
      });
      
      await loadStudents();
      setEditingStudent(null);
    } catch (error) {
      console.error('Erreur modification élève:', error);
    }
  };

  // Modifier le mot de passe d'un élève
  const updateStudentPassword = async (studentId, newPassword) => {
    try {
      await updateDoc(doc(db, 'students', studentId), {
        password: newPassword,
        updatedAt: new Date()
      });
      
      // Recharger les données pour synchroniser
      await loadStudents();
      return true;
    } catch (error) {
      console.error('Erreur modification mot de passe:', error);
      return false;
    }
  };

  // Supprimer un élève
  const deleteStudent = async (studentId) => {
    try {
      await deleteDoc(doc(db, 'students', studentId));
      await loadStudents();
    } catch (error) {
      console.error('Erreur suppression élève:', error);
    }
  };

  // Ajouter un résultat
  const addResult = async () => {
    if (!newResult.studentId || !newResult.testId || !newResult.value) return;
    
    try {
      await addDoc(collection(db, 'results'), {
        studentId: newResult.studentId,
        testId: newResult.testId,
        value: parseFloat(newResult.value),
        date: newResult.date,
        createdAt: new Date()
      });
      
      setNewResult({ studentId: '', testId: '', value: '', date: new Date().toISOString().split('T')[0] });
      await loadResults();
    } catch (error) {
      console.error('Erreur ajout résultat:', error);
    }
  };

  // Calculer le score sur 100
  const calculateScore = (value, test, student) => {
    const age = new Date().getFullYear() - new Date(student.birthDate).getFullYear();
    const baseScore = test.reverse ? Math.max(0, 100 - value * 2) : Math.min(100, value / 2);
    const ageAdjustment = (age - 12) * 2;
    const genderAdjustment = student.gender === 'F' ? 5 : 0;
    
    return Math.min(100, Math.max(0, baseScore + ageAdjustment + genderAdjustment));
  };

  // Obtenir l'évaluation textuelle
  const getEvaluation = (score) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-green-600' };
    if (score >= 75) return { text: 'Très Bien', color: 'text-blue-600' };
    if (score >= 60) return { text: 'Bien', color: 'text-yellow-600' };
    if (score >= 45) return { text: 'Moyen', color: 'text-orange-600' };
    return { text: 'À améliorer', color: 'text-red-600' };
  };

  // Connexion administrateur sécurisée
  const loginAdmin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      if (!checkIfAdmin(result.user.email)) {
        await signOut(auth);
        alert("❌ Accès refusé : Seuls les administrateurs EPS autorisés peuvent accéder à cette section");
        return false;
      }
      
      setCurrentUser({ 
        ...result.user, 
        type: 'admin',
        email: result.user.email,
        displayName: result.user.displayName
      });
      console.log("✅ Connexion administrateur réussie");
      return true;
    } catch (error) {
      console.error("Erreur de connexion:", error);
      alert("Erreur de connexion. Veuillez réessayer.");
      return false;
    }
  };

  // Connexion élève
  const loginStudent = (username, password) => {
    const student = students.find(s => s.username === username && s.password === password);
    if (student) {
      setCurrentUser({ ...student, type: 'student' });
      return true;
    }
    return false;
  };

  // Déconnexion sécurisée
  const handleLogout = async () => {
    try {
      if (currentUser?.type === 'admin') {
        await signOut(auth);
      }
      setCurrentUser(null);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  // Obtenir tous les tests
  const getAllTests = () => {
    return Object.values(testCategories).flat();
  };

  // Composant de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">Chargement des données...</p>
          <p className="text-gray-400 text-sm mt-2">Connexion à Firebase...</p>
        </div>
      </div>
    );
  }

  // Interface de connexion
  if (!currentUser) {
    return <LoginInterface onLoginAdmin={loginAdmin} onLoginStudent={loginStudent} />;
  }

  // Interface administrateur
  if (currentUser.type === 'admin') {
    return (
      <AdminInterface
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        testCategories={testCategories}
        students={students}
        results={results}
        classes={classes}
        newTest={newTest}
        setNewTest={setNewTest}
        newStudent={newStudent}
        setNewStudent={setNewStudent}
        newResult={newResult}
        setNewResult={setNewResult}
        addTest={addTest}
        deleteTest={deleteTest}
        addStudent={addStudent}
        updateStudent={updateStudent}
        updateStudentPassword={updateStudentPassword}
        deleteStudent={deleteStudent}
        addResult={addResult}
        editingStudent={editingStudent}
        setEditingStudent={setEditingStudent}
        calculateScore={calculateScore}
        getEvaluation={getEvaluation}
        getAllTests={getAllTests}
        allResults={results}
        allStudents={students}
        onLogout={handleLogout}
      />
    );
  }

  // Interface élève
  return (
    <StudentInterface
      student={currentUser}
      results={results}
      testCategories={testCategories}
      calculateScore={calculateScore}
      getEvaluation={getEvaluation}
      getAllTests={getAllTests}
      allResults={results}
      allStudents={students}
      updateStudentPassword={updateStudentPassword}
      setCurrentUser={setCurrentUser}
      onLogout={handleLogout}
    />
  );
};

// Composant interface de connexion
const LoginInterface = ({ onLoginAdmin, onLoginStudent }) => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' ou 'register'
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M',
    class: '6A',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleStudentLogin = () => {
    if (onLoginStudent(loginData.username, loginData.password)) {
      setLoginError('');
    } else {
      setLoginError('Identifiant ou mot de passe incorrect');
    }
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    setLoginError('');
    
    try {
      const success = await onLoginAdmin();
      if (!success) {
        setLoginError('Connexion administrateur échouée');
      }
    } catch (error) {
      setLoginError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const generateStudentId = (firstName, lastName) => {
    return `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
  };

  const handleStudentRegister = async () => {
    // Validation des champs
    if (!registerData.firstName.trim() || !registerData.lastName.trim() || 
        !registerData.birthDate || !registerData.password.trim()) {
      setRegisterError('Tous les champs sont obligatoires');
      return;
    }

    if (registerData.password.length < 4) {
      setRegisterError('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    setIsLoading(true);
    setRegisterError('');

    const username = generateStudentId(registerData.firstName, registerData.lastName);

    try {
      // Vérifier si l'username existe déjà
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const existingStudent = studentsSnapshot.docs.find(doc => 
        doc.data().username === username
      );

      if (existingStudent) {
        setRegisterError(`Un compte existe déjà pour ${registerData.firstName} ${registerData.lastName}`);
        setIsLoading(false);
        return;
      }

      // Créer le compte
      await addDoc(collection(db, 'students'), {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        birthDate: registerData.birthDate,
        gender: registerData.gender,
        class: registerData.class,
        username,
        password: registerData.password,
        createdAt: new Date()
      });

      setRegisterSuccess(true);
      
      // Auto-connexion après inscription
      setTimeout(() => {
        if (onLoginStudent(username, registerData.password)) {
          setRegisterError('');
        }
      }, 1500);

    } catch (error) {
      console.error('Erreur création compte:', error);
      setRegisterError('Erreur lors de la création du compte. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <BarChart3 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Suivi des Tests Sportifs</h1>
          <p className="text-gray-400">Collège - Système de gestion</p>
          <div className="mt-2 text-xs text-green-400 bg-green-900/20 rounded-lg p-2">
            🔥 Connecté à Firebase
          </div>
          <div className="mt-2 text-xs text-blue-400 bg-blue-900/20 rounded-lg p-2">
            🔒 Accès administrateurs EPS sécurisé
          </div>
        </div>

        {/* Onglets */}
        <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => {
              setActiveTab('login');
              setLoginError('');
              setRegisterError('');
              setRegisterSuccess(false);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'login' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setLoginError('');
              setRegisterError('');
              setRegisterSuccess(false);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'register' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            S'inscrire
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'login' ? (
          // ONGLET CONNEXION
          <div className="space-y-4">
            <button
              onClick={handleAdminLogin}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  Connexion Administrateur (Google)
                </>
              )}
            </button>

            {loginError && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg p-2">
                {loginError}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">ou</span>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Identifiant élève"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                className="w-full bg-gray-700 text-white p-3 rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleStudentLogin()}
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full bg-gray-700 text-white p-3 rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleStudentLogin()}
              />
              <button
                onClick={handleStudentLogin}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-5 h-5" />
                Connexion Élève
              </button>
            </div>

            <div className="text-xs text-gray-400 text-center mt-4">
              <p>Pas encore de compte ? Utilisez l'onglet <span className="text-green-400 font-medium">"S'inscrire"</span> !</p>
            </div>
          </div>
        ) : (
          // ONGLET INSCRIPTION
          <div className="space-y-4">
            {registerSuccess ? (
              <div className="text-center py-8">
                <div className="text-green-400 text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-white mb-2">Compte créé avec succès !</h3>
                <p className="text-gray-400 mb-4">
                  Votre identifiant : <span className="text-blue-400 font-medium">
                    {generateStudentId(registerData.firstName, registerData.lastName)}
                  </span>
                </p>
                <p className="text-gray-400">Connexion automatique...</p>
                <Loader className="w-6 h-6 animate-spin text-blue-500 mx-auto mt-4" />
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-4 text-center">Créer un compte élève</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                    className="bg-gray-700 text-white p-3 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Nom"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                    className="bg-gray-700 text-white p-3 rounded-lg"
                  />
                </div>

                <input
                  type="date"
                  value={registerData.birthDate}
                  onChange={(e) => setRegisterData({ ...registerData, birthDate: e.target.value })}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg"
                />

                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={registerData.gender}
                    onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                    className="bg-gray-700 text-white p-3 rounded-lg"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                  <select
                    value={registerData.class}
                    onChange={(e) => setRegisterData({ ...registerData, class: e.target.value })}
                    className="bg-gray-700 text-white p-3 rounded-lg"
                  >
                    {['6A', '6B', '6C', '5A', '5B', '4A', '4B', '4C', '3A', '3B', '3C'].map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <input
                  type="password"
                  placeholder="Choisissez votre mot de passe"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg"
                />

                {registerData.firstName && registerData.lastName && (
                  <div className="text-center text-sm text-gray-400 bg-gray-700/50 rounded-lg p-2">
                    Votre identifiant sera : <span className="text-blue-400 font-medium">
                      {generateStudentId(registerData.firstName, registerData.lastName)}
                    </span>
                  </div>
                )}

                {registerError && (
                  <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg p-2">
                    {registerError}
                  </div>
                )}

                <button
                  onClick={handleStudentRegister}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Création du compte...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Créer mon compte
                    </>
                  )}
                </button>

                <div className="text-xs text-gray-500 text-center">
                  <p>En créant un compte, vous acceptez les conditions d'utilisation du système de gestion des tests sportifs.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant interface administrateur
const AdminInterface = ({
  currentUser, activeTab, setActiveTab, testCategories, students, results, classes,
  newTest, setNewTest, newStudent, setNewStudent, newResult, setNewResult,
  addTest, deleteTest, addStudent, updateStudent, deleteStudent, addResult,
  editingStudent, setEditingStudent, calculateScore, getEvaluation, getAllTests, allResults, allStudents, onLogout
}) => {
  const tabs = [
    { id: 'tests', label: 'Gestion des Tests', icon: FileText },
    { id: 'students', label: 'Gestion des Élèves', icon: Users },
    { id: 'results', label: 'Saisie des Résultats', icon: FileText },
    { id: 'scores', label: 'Résultats et Scores', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Administration - Tests Sportifs</h1>
            <p className="text-green-400 text-sm">🔥 Firebase connecté - eps-sante-ydm</p>
            <p className="text-blue-400 text-sm">
              ✅ Connecté : {currentUser.displayName || currentUser.email}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-400 hover:text-white flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex">
        <nav className="w-64 bg-gray-800 min-h-screen p-4">
          <div className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="flex-1 p-6">
          {activeTab === 'tests' && (
            <TestManagement
              testCategories={testCategories}
              newTest={newTest}
              setNewTest={setNewTest}
              addTest={addTest}
              deleteTest={deleteTest}
            />
          )}
          
          {activeTab === 'students' && (
            <StudentManagement
              students={students}
              classes={classes}
              newStudent={newStudent}
              setNewStudent={setNewStudent}
              addStudent={addStudent}
              updateStudent={updateStudent}
              deleteStudent={deleteStudent}
              editingStudent={editingStudent}
              setEditingStudent={setEditingStudent}
            />
          )}
          
          {activeTab === 'results' && (
            <ResultsEntry
              students={students}
              allTests={getAllTests()}
              newResult={newResult}
              setNewResult={setNewResult}
              addResult={addResult}
            />
          )}
          
          {activeTab === 'scores' && (
            <ScoresDisplay
              students={students}
              results={results}
              allTests={getAllTests()}
              calculateScore={calculateScore}
              getEvaluation={getEvaluation}
              allResults={allResults}
              allStudents={allStudents}
            />
          )}
        </main>
      </div>
    </div>
  );
};

// Composant gestion des tests
const TestManagement = ({ testCategories, newTest, setNewTest, addTest, deleteTest }) => {
  const categoryNames = {
    vitesse: 'Vitesse',
    endurance: 'Endurance',
    saut: 'Saut',
    lancer: 'Lancer',
    force: 'Force',
    souplesse: 'Souplesse',
    equilibre: 'Équilibre'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestion des Tests</h2>
        <div className="text-sm text-green-400 bg-green-900/20 rounded-lg px-3 py-1">
          Synchronisé avec Firebase
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ajouter un test</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={newTest.category}
            onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          >
            {Object.keys(categoryNames).map(cat => (
              <option key={cat} value={cat}>{categoryNames[cat]}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Nom du test"
            value={newTest.name}
            onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          />
          <input
            type="text"
            placeholder="Unité (ex: secondes)"
            value={newTest.unit}
            onChange={(e) => setNewTest({ ...newTest, unit: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={newTest.reverse}
                onChange={(e) => setNewTest({ ...newTest, reverse: e.target.checked })}
                className="rounded"
              />
              Score inversé
            </label>
            <button
              onClick={addTest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(testCategories).map(([category, tests]) => (
          <div key={category} className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{categoryNames[category]}</h3>
            <div className="space-y-2">
              {tests.map(test => (
                <div key={test.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{test.name}</p>
                    <p className="text-gray-400 text-sm">{test.unit}</p>
                  </div>
                  <button
                    onClick={() => deleteTest(test.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {tests.length === 0 && (
                <p className="text-gray-500 text-center py-4">Aucun test configuré</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant gestion des élèves
const StudentManagement = ({ students, classes, newStudent, setNewStudent, addStudent, updateStudent, deleteStudent, editingStudent, setEditingStudent }) => {
  const [editForm, setEditForm] = useState({});
  const [expandedLevels, setExpandedLevels] = useState({
    '6ème': true,
    '5ème': true,
    '4ème': true,
    '3ème': true
  });
  const [expandedClasses, setExpandedClasses] = useState({});

  // Fonction pour obtenir le niveau à partir de la classe
  const getLevel = (className) => {
    if (className.startsWith('6')) return '6ème';
    if (className.startsWith('5')) return '5ème';
    if (className.startsWith('4')) return '4ème';
    if (className.startsWith('3')) return '3ème';
    return 'Autre';
  };

  // Grouper les élèves par niveau puis par classe
  const groupedStudents = students.reduce((groups, student) => {
    const level = getLevel(student.class);
    const className = student.class;
    
    if (!groups[level]) {
      groups[level] = {};
    }
    if (!groups[level][className]) {
      groups[level][className] = [];
    }
    
    groups[level][className].push(student);
    return groups;
  }, {});

  // Ordonner les niveaux
  const orderedLevels = ['6ème', '5ème', '4ème', '3ème'].filter(level => groupedStudents[level]);

  const handleEditStart = (student) => {
    setEditingStudent(student.id);
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      birthDate: student.birthDate,
      gender: student.gender,
      class: student.class,
      password: student.password
    });
  };

  const handleEditCancel = () => {
    setEditingStudent(null);
    setEditForm({});
  };

  const handleEditSave = async (studentId) => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      alert('Le prénom et le nom sont obligatoires');
      return;
    }
    await updateStudent(studentId, editForm);
    setEditForm({});
  };

  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const toggleClass = (level, className) => {
    const key = `${level}-${className}`;
    setExpandedClasses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestion des Élèves</h2>
        <div className="flex gap-4">
          <div className="text-sm text-green-400 bg-green-900/20 rounded-lg px-3 py-1">
            {students.length} élèves total
          </div>
          <button
            onClick={() => {
              const allExpanded = Object.values(expandedLevels).every(v => v);
              const newState = allExpanded ? 
                { '6ème': false, '5ème': false, '4ème': false, '3ème': false } :
                { '6ème': true, '5ème': true, '4ème': true, '3ème': true };
              setExpandedLevels(newState);
            }}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {Object.values(expandedLevels).every(v => v) ? 'Tout replier' : 'Tout déplier'}
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ajouter un élève</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Prénom"
            value={newStudent.firstName}
            onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          />
          <input
            type="text"
            placeholder="Nom"
            value={newStudent.lastName}
            onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          />
          <input
            type="date"
            value={newStudent.birthDate}
            onChange={(e) => setNewStudent({ ...newStudent, birthDate: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          />
          <select
            value={newStudent.gender}
            onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          >
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
          <div className="flex gap-2">
            <select
              value={newStudent.class}
              onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
              className="bg-gray-700 text-white p-3 rounded-lg flex-1"
            >
              {['6A', '6B', '6C', '5A', '5B', '4A', '4B', '4C', '3A', '3B', '3C'].map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <button
              onClick={addStudent}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Liste organisée par niveau et classe */}
      <div className="space-y-4">
        {orderedLevels.map(level => {
          const levelClasses = Object.keys(groupedStudents[level]).sort();
          const levelStudentCount = Object.values(groupedStudents[level]).flat().length;
          
          return (
            <div key={level} className="bg-gray-800 rounded-lg overflow-hidden">
              {/* En-tête du niveau */}
              <button
                onClick={() => toggleLevel(level)}
                className="w-full p-4 bg-gray-700 hover:bg-gray-600 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedLevels[level] ? 
                    <RefreshCw className="w-5 h-5 text-blue-400 rotate-90 transition-transform" /> :
                    <RefreshCw className="w-5 h-5 text-gray-400 transition-transform" />
                  }
                  <h3 className="text-xl font-bold text-white">{level}</h3>
                  <span className="text-sm text-gray-300">({levelStudentCount} élèves)</span>
                </div>
                <div className="flex gap-2">
                  {levelClasses.map(className => (
                    <span key={className} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      {className}: {groupedStudents[level][className].length}
                    </span>
                  ))}
                </div>
              </button>

              {/* Contenu du niveau */}
              {expandedLevels[level] && (
                <div className="p-4 space-y-4">
                  {levelClasses.map(className => {
                    const classStudents = groupedStudents[level][className];
                    const classKey = `${level}-${className}`;
                    const isClassExpanded = expandedClasses[classKey] !== false; // Par défaut ouvert
                    
                    return (
                      <div key={className} className="bg-gray-700 rounded-lg overflow-hidden">
                        {/* En-tête de la classe */}
                        <button
                          onClick={() => toggleClass(level, className)}
                          className="w-full p-3 bg-gray-600 hover:bg-gray-500 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isClassExpanded ? 
                              <RefreshCw className="w-4 h-4 text-green-400 rotate-90 transition-transform" /> :
                              <RefreshCw className="w-4 h-4 text-gray-400 transition-transform" />
                            }
                            <h4 className="text-lg font-semibold text-white">Classe {className}</h4>
                            <span className="text-sm text-gray-300">({classStudents.length} élèves)</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                              ♂ {classStudents.filter(s => s.gender === 'M').length}
                            </span>
                            <span className="text-xs bg-pink-600 text-white px-2 py-1 rounded">
                              ♀ {classStudents.filter(s => s.gender === 'F').length}
                            </span>
                          </div>
                        </button>

                        {/* Tableau des élèves de la classe */}
                        {isClassExpanded && (
                          <div className="p-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-white text-sm">
                                <thead>
                                  <tr className="border-b border-gray-600">
                                    <th className="text-left p-2">Nom</th>
                                    <th className="text-left p-2">Genre</th>
                                    <th className="text-left p-2">Date naissance</th>
                                    <th className="text-left p-2">Identifiant</th>
                                    <th className="text-left p-2">Mot de passe</th>
                                    <th className="text-left p-2">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {classStudents
                                    .sort((a, b) => a.lastName.localeCompare(b.lastName))
                                    .map(student => (
                                    <tr key={student.id} className="border-b border-gray-600 hover:bg-gray-600/50">
                                      {editingStudent === student.id ? (
                                        // Mode édition
                                        <>
                                          <td className="p-2">
                                            <div className="flex gap-1">
                                              <input
                                                type="text"
                                                value={editForm.firstName}
                                                onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                                                className="bg-gray-700 text-white p-1 rounded text-xs w-16"
                                                placeholder="Prénom"
                                              />
                                              <input
                                                type="text"
                                                value={editForm.lastName}
                                                onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                                                className="bg-gray-700 text-white p-1 rounded text-xs w-16"
                                                placeholder="Nom"
                                              />
                                            </div>
                                          </td>
                                          <td className="p-2">
                                            <select
                                              value={editForm.gender}
                                              onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                                              className="bg-gray-700 text-white p-1 rounded text-xs"
                                            >
                                              <option value="M">M</option>
                                              <option value="F">F</option>
                                            </select>
                                          </td>
                                          <td className="p-2">
                                            <input
                                              type="date"
                                              value={editForm.birthDate}
                                              onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                                              className="bg-gray-700 text-white p-1 rounded text-xs"
                                            />
                                          </td>
                                          <td className="p-2 text-blue-400 text-xs">
                                            {editForm.firstName && editForm.lastName ? 
                                              `${editForm.firstName.toLowerCase().replace(/\s+/g, '')}.${editForm.lastName.toLowerCase().replace(/\s+/g, '')}` 
                                              : 'En attente...'
                                            }
                                          </td>
                                          <td className="p-2">
                                            <input
                                              type="text"
                                              value={editForm.password}
                                              onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                              className="bg-gray-700 text-white p-1 rounded text-xs w-16"
                                            />
                                          </td>
                                          <td className="p-2">
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleEditSave(student.id)}
                                                className="text-green-400 hover:text-green-300"
                                                title="Sauvegarder"
                                              >
                                                <Save className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={handleEditCancel}
                                                className="text-gray-400 hover:text-gray-300"
                                                title="Annuler"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </td>
                                        </>
                                      ) : (
                                        // Mode affichage
                                        <>
                                          <td className="p-2">{student.firstName} {student.lastName}</td>
                                          <td className="p-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                              student.gender === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                                            }`}>
                                              {student.gender === 'M' ? '♂' : '♀'}
                                            </span>
                                          </td>
                                          <td className="p-2 text-gray-300">{student.birthDate || 'Non renseigné'}</td>
                                          <td className="p-2 text-blue-400 text-xs">{student.username}</td>
                                          <td className="p-2 text-green-400 text-xs">{student.password}</td>
                                          <td className="p-2">
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleEditStart(student)}
                                                className="text-blue-400 hover:text-blue-300"
                                                title="Modifier"
                                              >
                                                <Edit className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => deleteStudent(student.id)}
                                                className="text-red-400 hover:text-red-300"
                                                title="Supprimer"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Composant saisie des résultats
const ResultsEntry = ({ students, allTests, newResult, setNewResult, addResult }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  // Fonction pour obtenir le niveau à partir de la classe
  const getLevel = (className) => {
    if (className.startsWith('6')) return '6ème';
    if (className.startsWith('5')) return '5ème';
    if (className.startsWith('4')) return '4ème';
    if (className.startsWith('3')) return '3ème';
    return 'Autre';
  };

  // Obtenir la liste des niveaux et classes uniques
  const levels = [...new Set(students.map(s => getLevel(s.class)))].sort();
  const classes = [...new Set(students.map(s => s.class))].sort();

  // Filtrer les élèves selon les critères
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === '' || student.class === selectedClass;
    const matchesLevel = selectedLevel === '' || getLevel(student.class) === selectedLevel;
    
    return matchesSearch && matchesClass && matchesLevel;
  }).sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setNewResult({ ...newResult, studentId: student.id });
  };

  const handleAddResult = async () => {
    if (!newResult.studentId || !newResult.testId || !newResult.value) {
      alert('Veuillez sélectionner un élève, un test et saisir un résultat');
      return;
    }
    
    await addResult();
    setSelectedStudent(null);
    setSearchTerm('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedLevel('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Saisie des Résultats</h2>
        <div className="flex gap-4">
          <div className="text-sm text-green-400 bg-green-900/20 rounded-lg px-3 py-1">
            Sauvegarde automatique Firebase
          </div>
          {selectedStudent && (
            <div className="text-sm text-blue-400 bg-blue-900/20 rounded-lg px-3 py-1">
              ✓ {selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.class})
            </div>
          )}
        </div>
      </div>
      
      {/* Formulaire de saisie */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Nouveau résultat</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Zone élève sélectionné */}
          <div className="bg-gray-700 rounded-lg p-3">
            {selectedStudent ? (
              <div className="text-center">
                <p className="text-white font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p className="text-gray-400 text-sm">Classe {selectedStudent.class}</p>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setNewResult({ ...newResult, studentId: '' });
                  }}
                  className="text-red-400 hover:text-red-300 text-xs mt-1"
                >
                  <X className="w-3 h-3 inline mr-1" />
                  Changer d'élève
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-center">Sélectionnez un élève ci-dessous</p>
            )}
          </div>

          {/* Sélection du test */}
          <select
            value={newResult.testId}
            onChange={(e) => setNewResult({ ...newResult, testId: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          >
            <option value="">Sélectionner un test</option>
            {allTests.map(test => (
              <option key={test.id} value={test.id}>
                {test.name} ({test.unit})
              </option>
            ))}
          </select>

          {/* Saisie du résultat */}
          <input
            type="number"
            step="0.01"
            placeholder="Résultat"
            value={newResult.value}
            onChange={(e) => setNewResult({ ...newResult, value: e.target.value })}
            className="bg-gray-700 text-white p-3 rounded-lg"
          />

          {/* Date et bouton */}
          <div className="flex gap-2">
            <input
              type="date"
              value={newResult.date}
              onChange={(e) => setNewResult({ ...newResult, date: e.target.value })}
              className="bg-gray-700 text-white p-3 rounded-lg flex-1"
            />
            <button
              onClick={handleAddResult}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      {/* Sélection d'élève avec recherche */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Rechercher et sélectionner un élève</h3>
        
        {/* Filtres de recherche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou identifiant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white p-3 pl-10 rounded-lg"
            />
            <Users className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
          
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="bg-gray-700 text-white p-3 rounded-lg"
          >
            <option value="">Tous les niveaux</option>
            {levels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-gray-700 text-white p-3 rounded-lg"
          >
            <option value="">Toutes les classes</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          
          <button
            onClick={clearFilters}
            className="bg-gray-600 hover:bg-gray-500 text-white p-3 rounded-lg flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Effacer filtres
          </button>
        </div>

        {/* Compteur de résultats */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-400 text-sm">
            {filteredStudents.length} élève{filteredStudents.length !== 1 ? 's' : ''} trouvé{filteredStudents.length !== 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
            {selectedLevel && ` en ${selectedLevel}`}
            {selectedClass && ` en classe ${selectedClass}`}
          </p>
          
          {filteredStudents.length > 20 && (
            <p className="text-yellow-400 text-sm">
              💡 Affichage limité aux 20 premiers résultats - affinez votre recherche
            </p>
          )}
        </div>

        {/* Liste des élèves */}
        <div className="bg-gray-700 rounded-lg max-h-96 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun élève trouvé avec ces critères</p>
              <button onClick={clearFilters} className="text-blue-400 hover:text-blue-300 mt-2">
                Effacer les filtres
              </button>
            </div>
          ) : (
            <table className="w-full text-white text-sm">
              <thead className="bg-gray-600 sticky top-0">
                <tr>
                  <th className="text-left p-3">Nom</th>
                  <th className="text-left p-3">Classe</th>
                  <th className="text-left p-3">Genre</th>
                  <th className="text-left p-3">Identifiant</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.slice(0, 20).map((student, index) => (
                  <tr 
                    key={student.id} 
                    className={`border-b border-gray-600 hover:bg-gray-600 cursor-pointer ${
                      selectedStudent?.id === student.id ? 'bg-blue-600' : ''
                    } ${index % 2 === 0 ? 'bg-gray-700/50' : ''}`}
                    onClick={() => selectStudent(student)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                          student.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500'
                        }`}>
                          {student.gender === 'M' ? '♂' : '♀'}
                        </span>
                        <span className="font-medium">{student.lastName} {student.firstName}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="bg-gray-600 px-2 py-1 rounded text-xs">{student.class}</span>
                    </td>
                    <td className="p-3">{student.gender === 'M' ? 'Masculin' : 'Féminin'}</td>
                    <td className="p-3 text-blue-400">{student.username}</td>
                    <td className="p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectStudent(student);
                        }}
                        className={`px-3 py-1 rounded text-xs ${
                          selectedStudent?.id === student.id
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {selectedStudent?.id === student.id ? '✓ Sélectionné' : 'Sélectionner'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant affichage des scores
const ScoresDisplay = ({ students, results, allTests, calculateScore, getEvaluation, allResults, allStudents }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Résultats et Scores</h2>
        <div className="text-sm text-green-400 bg-green-900/20 rounded-lg px-3 py-1">
          {results.length} résultats en base
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(student => {
          const studentResults = results.filter(r => r.studentId === student.id);
          
          return (
            <div key={student.id} className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                {student.firstName} {student.lastName}
              </h3>
              <p className="text-gray-400 mb-4">Classe {student.class}</p>
              
              <div className="space-y-3">
                {studentResults.map(result => {
                  const test = allTests.find(t => t.id === result.testId);
                  if (!test) return null;
                  
                  const score = calculateScore(result.value, test, student, allResults, allStudents);
                  const evaluation = getEvaluation(score);
                  
                  return (
                    <div key={result.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">{test.name}</span>
                        <span className={`font-bold ${evaluation.color}`}>
                          {score !== null ? `${score}/100` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">{result.value} {test.unit}</span>
                        <span className={evaluation.color}>{evaluation.text}</span>
                      </div>
                      {evaluation.message && (
                        <p className="text-xs text-gray-300 italic">{evaluation.message}</p>
                      )}
                      {score !== null && (
                        <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {studentResults.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Aucun résultat enregistré</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Composant interface élève
const StudentInterface = ({ student, results, testCategories, calculateScore, getEvaluation, getAllTests, allResults, allStudents, updateStudentPassword, setCurrentUser, onLogout }) => {
  const studentResults = results.filter(r => r.studentId === student.id);
  const allTests = getAllTests();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (passwordForm.currentPassword !== student.password) {
      setPasswordError('Mot de passe actuel incorrect');
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 4 caractères');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError('Le nouveau mot de passe doit être différent de l\'ancien');
      return;
    }

    // Mise à jour
    const success = await updateStudentPassword(student.id, passwordForm.newPassword);
    
    if (success) {
      setPasswordSuccess('Mot de passe modifié avec succès !');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
      
      // Mettre à jour les données de l'utilisateur connecté
      setCurrentUser({ ...student, password: passwordForm.newPassword });
      
      // Message de confirmation temporaire
      setTimeout(() => {
        setPasswordSuccess('');
      }, 3000);
    } else {
      setPasswordError('Erreur lors de la modification du mot de passe');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-gray-400">Classe {student.class}</p>
            <p className="text-green-400 text-sm">🔥 Données synchronisées Firebase</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm"
            >
              <User className="w-4 h-4" />
              Modifier mon mot de passe
            </button>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Section modification mot de passe */}
        {showPasswordChange && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Modifier mon mot de passe</h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="password"
                  placeholder="Mot de passe actuel"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="bg-gray-700 text-white p-3 rounded-lg"
                  required
                />
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="bg-gray-700 text-white p-3 rounded-lg"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirmer le nouveau mot de passe"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="bg-gray-700 text-white p-3 rounded-lg"
                  required
                />
              </div>
              
              {passwordError && (
                <div className="text-red-400 text-sm bg-red-900/20 rounded-lg p-3">
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="text-green-400 text-sm bg-green-900/20 rounded-lg p-3">
                  {passwordSuccess}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
              </div>
            </form>
            
            <div className="mt-4 text-xs text-gray-400">
              <p>💡 <strong>Conseils pour un bon mot de passe :</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Au moins 4 caractères (mais plus c'est mieux !)</li>
                <li>Utilisez des chiffres et des lettres</li>
                <li>Choisissez quelque chose de facile à retenir pour vous</li>
              </ul>
            </div>
          </div>
        )}

        {/* Section résultats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(testCategories).map(([category, tests]) => {
            const categoryResults = studentResults.filter(result => 
              tests.some(test => test.id === result.testId)
            );
            
            if (categoryResults.length === 0) return null;
            
            return (
              <div key={category} className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4 capitalize">
                  {category}
                </h2>
                
                <div className="space-y-4">
                  {categoryResults.map(result => {
                    const test = allTests.find(t => t.id === result.testId);
                    if (!test) return null;
                    
                    const score = calculateScore(result.value, test, student, allResults, allStudents);
                    const evaluation = getEvaluation(score);
                    
                    return (
                      <div key={result.id} className="text-center">
                        <div className="relative w-24 h-24 mx-auto mb-3">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="rgb(75, 85, 99)"
                              strokeWidth="8"
                              fill="none"
                            />
                            {score !== null && (
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke={score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#fb923c'}
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${score * 2.51} 251`}
                                strokeLinecap="round"
                              />
                            )}
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold">
                              {score !== null ? score : 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <h3 className="text-white font-medium mb-1">{test.name}</h3>
                        <p className="text-gray-400 text-sm mb-1">
                          {result.value} {test.unit}
                        </p>
                        <p className={`text-sm font-medium ${evaluation.color} mb-1`}>
                          {evaluation.text}
                        </p>
                        {evaluation.message && (
                          <p className="text-xs text-gray-300 italic px-2">
                            {evaluation.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {studentResults.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Aucun résultat disponible</h2>
            <p className="text-gray-400">Vos résultats apparaîtront ici une fois saisis par votre professeur.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;