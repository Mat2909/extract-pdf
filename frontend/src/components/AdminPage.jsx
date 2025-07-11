import React, { useState, useEffect } from 'react';
import profileManager from '../utils/profileManager';
import authManager from '../utils/authManager';

/**
 * Page d'administration
 * Interface pour gérer les profils et les modules
 */
function AdminPage({ onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [modules, setModules] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    modules: [],
    config: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const availableProfiles = profileManager.getProfiles();
      const availableModules = profileManager.getModules();
      setProfiles(availableProfiles);
      setModules(availableModules);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const handleCreateProfile = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      modules: [],
      config: {}
    });
    setEditingProfile(null);
    setShowCreateForm(true);
  };

  const handleEditProfile = (profile) => {
    setFormData({
      name: profile.name,
      description: profile.description,
      color: profile.color,
      modules: [...profile.modules],
      config: { ...profile.config }
    });
    setEditingProfile(profile);
    setShowCreateForm(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    try {
      const profileData = {
        ...formData,
        id: editingProfile ? editingProfile.id : formData.name.toLowerCase().replace(/\s+/g, '-'),
        active: true
      };

      if (editingProfile) {
        profileManager.updateProfile(editingProfile.id, profileData);
      } else {
        profileManager.createProfile(profileData);
      }

      setShowCreateForm(false);
      loadData();
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleDeleteProfile = (profileId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce profil ?')) {
      try {
        profileManager.deleteProfile(profileId);
        loadData();
      } catch (error) {
        alert(`Erreur: ${error.message}`);
      }
    }
  };

  const handleModuleToggle = (moduleId) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(id => id !== moduleId)
        : [...prev.modules, moduleId]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
              <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Accès administrateur
              </span>
            </div>
            
            <div className="text-sm text-gray-700">
              <span className="font-medium">{authManager.getDisplayName()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showCreateForm ? (
          // Liste des profils
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestion des profils</h2>
                <p className="mt-1 text-gray-600">Créez et modifiez les profils de traitement</p>
              </div>
              
              <button
                onClick={handleCreateProfile}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nouveau profil
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modules
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Configuration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: profile.color }}
                          >
                            {profile.name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{profile.name}</div>
                            <div className="text-sm text-gray-500">{profile.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {profile.modules.length} modules actifs
                        </div>
                        <div className="text-sm text-gray-500">
                          {profile.modules.slice(0, 3).map(moduleId => modules[moduleId]?.name).join(', ')}
                          {profile.modules.length > 3 && '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {profile.config?.exportFormat && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {profile.config.exportFormat.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditProfile(profile)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Formulaire de création/modification
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProfile ? 'Modifier le profil' : 'Nouveau profil'}
              </h2>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-8">
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Informations générales
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom du profil
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Couleur
                      </label>
                      <input
                        type="color"
                        name="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Modules du workflow
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Object.entries(modules).map(([moduleId, module]) => (
                      <div key={moduleId} className="relative flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={formData.modules.includes(moduleId)}
                            onChange={() => handleModuleToggle(moduleId)}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700">
                            {module.name}
                          </label>
                          <p className="text-gray-500">{module.description}</p>
                          {module.required && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                              Requis
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingProfile ? 'Mettre à jour' : 'Créer le profil'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPage;