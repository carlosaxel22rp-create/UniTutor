import { Monitor, Utensils, Dna, TrendingUp } from 'lucide-react';

export const careers = [
  { id: 'it', name: 'Tecnologías de la Información', code: 'TIID', icon: Monitor },
  { id: 'gastro', name: 'Gastronomía', code: 'GTRO', icon: Utensils },
  { id: 'bio', name: 'Biotecnología', code: 'BIIO', icon: Dna },
  { id: 'mkt', name: 'Mercadotecnia', code: 'MERC', icon: TrendingUp },
];

// 6.º y 10.º cuatrimestre omitidos porque son periodos de estadía sin materias
export const semesters = [
  '1er Cuatrimestre',
  '2do Cuatrimestre',
  '3er Cuatrimestre',
  '4to Cuatrimestre',
  '5to Cuatrimestre',
  '7mo Cuatrimestre',
  '8vo Cuatrimestre',
  '9no Cuatrimestre',
];

export const subjectsData = {
  it: {
    '1er Cuatrimestre': [
      { id: 'it1-1', name: 'Inglés I', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it1-2', name: 'Desarrollo Humano y Valores', image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80' },
      { id: 'it1-3', name: 'Fundamentos Matemáticos', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
      { id: 'it1-4', name: 'Fundamentos de Redes', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80' },
      { id: 'it1-5', name: 'Física', image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80' },
      { id: 'it1-6', name: 'Fundamentos de Programación', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80' },
      { id: 'it1-7', name: 'Comunicación y Habilidades Digitales', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80' },
    ],
    '2do Cuatrimestre': [
      { id: 'it2-1', name: 'Inglés II', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it2-2', name: 'Habilidades Socioemocionales y Manejo de Conflictos', image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&q=80' },
      { id: 'it2-3', name: 'Cálculo Diferencial', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80' },
      { id: 'it2-4', name: 'Conmutación y Enrutamiento de Redes', image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80' },
      { id: 'it2-5', name: 'Probabilidad y Estadística', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
      { id: 'it2-6', name: 'Programación Estructurada', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80' },
      { id: 'it2-7', name: 'Bases de Datos', image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80' },
    ],
    '3er Cuatrimestre': [
      { id: 'it3-1', name: 'Inglés III', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it3-2', name: 'Desarrollo del Pensamiento y Toma de Decisiones', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80' },
      { id: 'it3-3', name: 'Cálculo Integral', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
      { id: 'it3-4', name: 'Tópicos de Calidad para el Diseño de Software', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
      { id: 'it3-5', name: 'Programación Orientada a Objetos', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?w=400&q=80' },
      { id: 'it3-6', name: 'Estructura de Datos', image: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&q=80' },
      { id: 'it3-7', name: 'Sistemas Operativos', image: 'https://images.unsplash.com/photo-1629654261662-779ee3e0e4cc?w=400&q=80' },
    ],
    '4to Cuatrimestre': [
      { id: 'it4-1', name: 'Inglés IV', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it4-2', name: 'Ética Profesional', image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80' },
      { id: 'it4-3', name: 'Cálculo de Varias Variables', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80' },
      { id: 'it4-4', name: 'Aplicaciones Web', image: 'https://images.unsplash.com/photo-1627398240309-08a1a5362a53?w=400&q=80' },
      { id: 'it4-5', name: 'Desarrollo de Aplicaciones Móviles', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80' },
      { id: 'it4-6', name: 'Bases de Datos Avanzadas', image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80' },
      { id: 'it4-7', name: 'Proyecto Integrador I', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '5to Cuatrimestre': [
      { id: 'it5-1', name: 'Inglés V', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it5-2', name: 'Liderazgo de Equipos de Alto Desempeño', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80' },
      { id: 'it5-3', name: 'Ecuaciones Diferenciales', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
      { id: 'it5-4', name: 'Aplicaciones Web Orientadas a Servicios', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80' },
      { id: 'it5-5', name: 'Análisis y Diseño de Software', image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&q=80' },
      { id: 'it5-6', name: 'Estándares y Métricas para el Desarrollo de Software', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
      { id: 'it5-7', name: 'Proyecto Integrador II', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '7mo Cuatrimestre': [
      { id: 'it7-1', name: 'Inglés VI', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it7-2', name: 'Habilidades Gerenciales', image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80' },
      { id: 'it7-3', name: 'Formulación de Proyectos de Tecnología', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80' },
      { id: 'it7-4', name: 'Fundamentos de Inteligencia Artificial', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80' },
      { id: 'it7-5', name: 'Ética y Legislación en Tecnologías de la Información', image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80' },
      { id: 'it7-6', name: 'Optativa I', image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80' },
    ],
    '8vo Cuatrimestre': [
      { id: 'it8-1', name: 'Inglés VII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it8-2', name: 'Electrónica Digital', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80' },
      { id: 'it8-3', name: 'Gestión de Proyectos de Tecnología', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80' },
      { id: 'it8-4', name: 'Programación para Inteligencia Artificial', image: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&q=80' },
      { id: 'it8-5', name: 'Administración de Servidores', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80' },
      { id: 'it8-6', name: 'Seguridad Informática', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80' },
      { id: 'it8-7', name: 'Optativa II', image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80' },
    ],
    '9no Cuatrimestre': [
      { id: 'it9-1', name: 'Inglés VIII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'it9-2', name: 'Internet de las Cosas', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80' },
      { id: 'it9-3', name: 'Evaluación de Proyectos de Tecnología', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
      { id: 'it9-4', name: 'Ciencia de Datos', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
      { id: 'it9-5', name: 'Tecnologías Disruptivas', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80' },
      { id: 'it9-6', name: 'Informática Forense', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80' },
      { id: 'it9-7', name: 'Optativa III', image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80' },
      { id: 'it9-8', name: 'Proyecto Integrador III', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
  },
  gastro: {
    '1er Cuatrimestre': [
      { id: 'ga1-1', name: 'Inglés I', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga1-2', name: 'Bases Culinarias', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80' },
      { id: 'ga1-3', name: 'Higiene y Manejo de Alimentos', image: 'https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=400&q=80' },
      { id: 'ga1-4', name: 'Historia de la Gastronomía', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80' },
      { id: 'ga1-5', name: 'Nutrición Básica', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80' },
    ],
    '2do Cuatrimestre': [
      { id: 'ga2-1', name: 'Inglés II', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga2-2', name: 'Cocina Mexicana Tradicional', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80' },
      { id: 'ga2-3', name: 'Panadería Artesanal', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80' },
      { id: 'ga2-4', name: 'Costos de Alimentos y Bebidas', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80' },
      { id: 'ga2-5', name: 'Química de los Alimentos', image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80' },
    ],
    '3er Cuatrimestre': [
      { id: 'ga3-1', name: 'Inglés III', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga3-2', name: 'Repostería Básica', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80' },
      { id: 'ga3-3', name: 'Cocina Francesa e Italiana', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80' },
      { id: 'ga3-4', name: 'Servicio de Alimentos y Bebidas', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80' },
      { id: 'ga3-5', name: 'Conservación de Alimentos', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&q=80' },
    ],
    '4to Cuatrimestre': [
      { id: 'ga4-1', name: 'Inglés IV', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga4-2', name: 'Repostería Avanzada y Chocolatería', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&q=80' },
      { id: 'ga4-3', name: 'Cocina Asiática y Mediterránea', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80' },
      { id: 'ga4-4', name: 'Enología y Coctelería', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80' },
      { id: 'ga4-5', name: 'Proyecto Integrador I', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '5to Cuatrimestre': [
      { id: 'ga5-1', name: 'Inglés V', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga5-2', name: 'Cocina de Vanguardia y Molecular', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80' },
      { id: 'ga5-3', name: 'Administración de Restaurantes', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80' },
      { id: 'ga5-4', name: 'Organización de Banquetes y Eventos', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80' },
      { id: 'ga5-5', name: 'Proyecto Integrador II', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '7mo Cuatrimestre': [
      { id: 'ga7-1', name: 'Inglés VI', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga7-2', name: 'Diseño de Menús e Ingeniería Gastronómica', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80' },
      { id: 'ga7-3', name: 'Patrimonio Gastronómico de México', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80' },
      { id: 'ga7-4', name: 'Marketing Gastronómico', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
    ],
    '8vo Cuatrimestre': [
      { id: 'ga8-1', name: 'Inglés VII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga8-2', name: 'Dirección de Empresas Gastronómicas', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80' },
      { id: 'ga8-3', name: 'Cocina de Autor', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80' },
      { id: 'ga8-4', name: 'Calidad y Certificaciones Alimentarias', image: 'https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=400&q=80' },
    ],
    '9no Cuatrimestre': [
      { id: 'ga9-1', name: 'Inglés VIII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'ga9-2', name: 'Evaluación de Proyectos Gastronómicos', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80' },
      { id: 'ga9-3', name: 'Tendencias Globales y Sustentabilidad Culinaria', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80' },
      { id: 'ga9-4', name: 'Proyecto Integrador III', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
  },
  bio: {
    '1er Cuatrimestre': [
      { id: 'bi1-1', name: 'Inglés I', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi1-2', name: 'Química General e Inorgánica', image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80' },
      { id: 'bi1-3', name: 'Biología Celular', image: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&q=80' },
      { id: 'bi1-4', name: 'Álgebra Lineal y Funciones', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
      { id: 'bi1-5', name: 'Seguridad en el Laboratorio', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&q=80' },
    ],
    '2do Cuatrimestre': [
      { id: 'bi2-1', name: 'Inglés II', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi2-2', name: 'Química Orgánica', image: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=400&q=80' },
      { id: 'bi2-3', name: 'Microbiología General', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&q=80' },
      { id: 'bi2-4', name: 'Cálculo Diferencial e Integral', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80' },
      { id: 'bi2-5', name: 'Termodinámica', image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80' },
    ],
    '3er Cuatrimestre': [
      { id: 'bi3-1', name: 'Inglés III', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi3-2', name: 'Bioquímica', image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80' },
      { id: 'bi3-3', name: 'Química Analítica e Instrumental', image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400&q=80' },
      { id: 'bi3-4', name: 'Bioestadística', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
      { id: 'bi3-5', name: 'Fisiología Vegetal y Animal', image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&q=80' },
    ],
    '4to Cuatrimestre': [
      { id: 'bi4-1', name: 'Inglés IV', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi4-2', name: 'Biología Molecular y Genética', image: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&q=80' },
      { id: 'bi4-3', name: 'Balance de Materia y Energía', image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80' },
      { id: 'bi4-4', name: 'Cultivo de Tejidos Vegetales', image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&q=80' },
      { id: 'bi4-5', name: 'Proyecto Integrador I', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '5to Cuatrimestre': [
      { id: 'bi5-1', name: 'Inglés V', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi5-2', name: 'Ingeniería Genética', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&q=80' },
      { id: 'bi5-3', name: 'Fenómenos de Transporte', image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400&q=80' },
      { id: 'bi5-4', name: 'Enzimología y Cinética', image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80' },
      { id: 'bi5-5', name: 'Proyecto Integrador II', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '7mo Cuatrimestre': [
      { id: 'bi7-1', name: 'Inglés VI', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi7-2', name: 'Ingeniería de Biorreactores', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&q=80' },
      { id: 'bi7-3', name: 'Bioinformática', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80' },
      { id: 'bi7-4', name: 'Biotecnología Ambiental', image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&q=80' },
    ],
    '8vo Cuatrimestre': [
      { id: 'bi8-1', name: 'Inglés VII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi8-2', name: 'Bioseparaciones', image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400&q=80' },
      { id: 'bi8-3', name: 'Biotecnología Alimentaria y Farmacéutica', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&q=80' },
      { id: 'bi8-4', name: 'Control de Calidad y Bioética', image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80' },
    ],
    '9no Cuatrimestre': [
      { id: 'bi9-1', name: 'Inglés VIII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'bi9-2', name: 'Diseño de Plantas Biotecnológicas', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&q=80' },
      { id: 'bi9-3', name: 'Evaluación de Proyectos Biotecnológicos', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
      { id: 'bi9-4', name: 'Proyecto Integrador III', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
  },
  mkt: {
    '1er Cuatrimestre': [
      { id: 'mk1-1', name: 'Inglés I', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk1-2', name: 'Fundamentos de Mercadotecnia', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
      { id: 'mk1-3', name: 'Administración de las Organizaciones', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80' },
      { id: 'mk1-4', name: 'Economía y Entorno Empresarial', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80' },
      { id: 'mk1-5', name: 'Matemáticas Aplicadas a los Negocios', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
    ],
    '2do Cuatrimestre': [
      { id: 'mk2-1', name: 'Inglés II', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk2-2', name: 'Comportamiento del Consumidor', image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80' },
      { id: 'mk2-3', name: 'Contabilidad y Costos', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80' },
      { id: 'mk2-4', name: 'Estadística para Mercadotecnia', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
      { id: 'mk2-5', name: 'Diseño Gráfico y Publicitario', image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&q=80' },
    ],
    '3er Cuatrimestre': [
      { id: 'mk3-1', name: 'Inglés III', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk3-2', name: 'Investigación de Mercados I', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
      { id: 'mk3-3', name: 'Mezcla Promocional y Publicidad', image: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=400&q=80' },
      { id: 'mk3-4', name: 'Gestión de Producto y Precio', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
      { id: 'mk3-5', name: 'Legislación Comercial y Propiedad Intelectual', image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80' },
    ],
    '4to Cuatrimestre': [
      { id: 'mk4-1', name: 'Inglés IV', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk4-2', name: 'Investigación de Mercados II', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
      { id: 'mk4-3', name: 'Marketing Digital y Redes Sociales', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80' },
      { id: 'mk4-4', name: 'Administración de Ventas y Canales', image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80' },
      { id: 'mk4-5', name: 'Proyecto Integrador I', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '5to Cuatrimestre': [
      { id: 'mk5-1', name: 'Inglés V', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk5-2', name: 'Comercio Electrónico (E-Commerce)', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80' },
      { id: 'mk5-3', name: 'Planeación Estratégica de Mercadotecnia', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80' },
      { id: 'mk5-4', name: 'Relaciones Públicas y Comunicación Corporativa', image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&q=80' },
      { id: 'mk5-5', name: 'Proyecto Integrador II', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
    '7mo Cuatrimestre': [
      { id: 'mk7-1', name: 'Inglés VI', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk7-2', name: 'SEO, SEM y Analítica Web', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
      { id: 'mk7-3', name: 'Mercadotecnia Internacional', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80' },
      { id: 'mk7-4', name: 'Branding y Gestión de Marca', image: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=400&q=80' },
    ],
    '8vo Cuatrimestre': [
      { id: 'mk8-1', name: 'Inglés VII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk8-2', name: 'Neuromarketing e Inteligencia de Mercados', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80' },
      { id: 'mk8-3', name: 'Logística y Cadena de Suministro', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80' },
      { id: 'mk8-4', name: 'Finanzas para la Mercadotecnia', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80' },
    ],
    '9no Cuatrimestre': [
      { id: 'mk9-1', name: 'Inglés VIII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
      { id: 'mk9-2', name: 'Dirección Comercial y Consultoría', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80' },
      { id: 'mk9-3', name: 'Evaluación de Proyectos de Inversión', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
      { id: 'mk9-4', name: 'Proyecto Integrador III', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
    ],
  },
};

export const baseTutors = [
  { id: 1, name: 'Carlos Axel Rodea', age: 20, rating: 5.0, reviews: 34, image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80', description: '¡Hola! Me gusta enseñar con ejemplos prácticos y proyectos reales para que la teoría tenga sentido y sea fácil de aplicar.' },
  { id: 2, name: 'Danna Paola', age: 20, rating: 4.9, reviews: 28, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80', description: 'Apasionada por el diseño y la estructura. Te ayudo a que tus proyectos no solo funcionen, sino que destaquen por su calidad.' },
  { id: 3, name: 'Luis Fernando', age: 22, rating: 4.5, reviews: 12, image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80', description: 'Si tienes problemas entendiendo conceptos complejos, soy tu mejor opción para simplificarlos y que apruebes el examen.' },
  { id: 4, name: 'María José', age: 21, rating: 4.8, reviews: 45, image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80', description: 'La paciencia y dedicación son mi lema. Avanzaremos a tu propio ritmo hasta que domines el tema por completo.' },
  { id: 5, name: 'Javier Domínguez', age: 23, rating: 4.7, reviews: 19, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80', description: 'Enfocado en resultados y en prepararte con simuladores de exámenes para los retos más difíciles del cuatrimestre.' },
  { id: 6, name: 'Ana Victoria', age: 19, rating: 5.0, reviews: 11, image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80', description: 'Comparto mis apuntes, resúmenes organizados y trucos para aprender rápido, eficientemente y sin estrés.' },
  { id: 7, name: 'Miguel Ángel', age: 24, rating: 4.6, reviews: 33, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80', description: 'Tengo experiencia asesorando a más de 30 compañeros en la universidad, siempre buscando la excelencia académica.' },
  { id: 8, name: 'Sofía Reyes', age: 20, rating: 4.9, reviews: 22, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80', description: 'Haremos sesiones dinámicas e interactivas. Resolveremos guías de estudio completas para que vayas 100% seguro.' },
  { id: 9, name: 'Roberto Gómez', age: 22, rating: 4.4, reviews: 15, image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80', description: 'Conmigo aprenderás la lógica y el "por qué" detrás de cada problema, no solo a memorizar procesos mecánicos.' },
];

export const extraSubjectsPool = [
  'Lógica y Análisis',
  'Habilidades de Estudio',
  'Redacción de Proyectos',
  'Inglés Técnico',
  'Metodologías de Investigación',
  'Pensamiento Crítico',
  'Matemáticas Aplicadas',
  'Resolución de Problemas',
  'Trabajo en Equipo',
];

export function getSubjectsByCareerAndSemester(careerId, semester, customSubjects = []) {
  if (!careerId || !semester) return [];
  const staticList = subjectsData[careerId]?.[semester] || [];
  const fromDb = customSubjects.filter(
    (s) => s.career_id === careerId && s.semester === semester
  );
  // Evitar duplicados por id
  const existingIds = new Set(staticList.map((s) => s.id));
  const merged = [...staticList, ...fromDb.filter((s) => !existingIds.has(s.id))];
  return merged;
}

export function getAllSubjectsFlat() {
  const all = [];
  for (const career of careers) {
    const bySemester = subjectsData[career.id] || {};
    for (const sem of semesters) {
      const list = bySemester[sem] || [];
      for (const sub of list) {
        all.push({
          ...sub,
          career_id: career.id,
          career_name: career.name,
          semester: sem,
        });
      }
    }
  }
  return all;
}

export function getDynamicTutorsForSubject(subject, careerId) {
  if (!subject) return [];
  const seed = subject.name.length + subject.name.charCodeAt(0);
  const careerName = careers.find((c) => c.id === careerId)?.name || 'Universidad';

  const generatedTutors = [];
  for (let i = 0; i < 3; i++) {
    const tutorIndex = (seed + i) % baseTutors.length;
    const baseTutor = baseTutors[tutorIndex];
    const extra1 = extraSubjectsPool[(seed + i) % extraSubjectsPool.length];
    const extra2 = extraSubjectsPool[(seed + i + 1) % extraSubjectsPool.length];

    generatedTutors.push({
      ...baseTutor,
      uniqueId: `${baseTutor.id}-${subject.id}`,
      career: careerName,
      subjects: [subject.name, extra1, extra2],
      hours: ['09:00 AM', '12:00 PM', '04:00 PM', '06:00 PM'],
    });
  }
  return generatedTutors;
}
