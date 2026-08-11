export const standalonePages = {
  confluent: {
    file: './content/tecnologias/confluent.html',
    title: 'Confluent Cloud',
    category: 'integraciones'
  },
  'watsonx-data-integration': {
    file: './content/tecnologias/watsonx-data-integration.html',
    title: 'watsonx.data integration',
    category: 'integraciones'
  }
};

export const siteData = {
  topNav: [
    { label: 'Inicio', href: '#/' },
    { label: 'Tecnologías', href: '#available-technologies' },
    { label: 'Bootcamps', href: '#available-workshops' },
    { label: 'Equipo', href: '#nosotros' },
    { label: 'Acerca de', href: '#acerca-de' }
  ],
  technologies: [
    {
      slug: 'confluent',
      title: 'Confluent Cloud',
      description: 'Plataforma de data streaming: Kafka, Flink, Schema Registry y Tableflow.',
      context: 'Event streaming · SaaS',
      tags: [
        { label: 'Kafka', tone: 'purple' },
        { label: 'Flink', tone: 'teal' },
        { label: 'Gobernanza', tone: 'blue' }
      ],
      image: './assets/images/labs/confluent/confluent.png',
      route: '#/page/confluent'
    },
    {
      slug: 'watsonx-data-integration',
      title: 'watsonx.data integration',
      description: 'Plano de control unificado: DataStage, StreamSets, Data Replication, Databand y datos no estructurados en una sola plataforma.',
      context: 'Integración · IBM',
      tags: [
        { label: 'DataStage', tone: 'blue' },
        { label: 'StreamSets', tone: 'purple' },
        { label: 'CDC · UDI', tone: 'teal' }
      ],
      image: './assets/images/labs/wxdi/ibm-think-watsonx-data.webp',
      route: '#/page/watsonx-data-integration'
    }
  ],
  hero: {
    eyebrow: 'IBM · Data Integration',
    title: 'Bootcamps de integración de datos',
    description: 'Explora casos prácticos que conectan streaming, integración y agentes de IA mediante arquitecturas reales y ejercicios guiados.',
    ctaLabel: 'Explorar bootcamps'
  },
  sections: [
    {
      id: 'integraciones',
      title: 'Casos end-to-end',
      eyebrow: 'Bootcamps',
      description: 'Aprende construyendo flujos completos con recursos preparados, configuraciones verificadas y criterios de éxito medibles.',
      labs: [
        {
          slug: 'fraud-detection',
          title: 'Detección de fraude financiero en tiempo real',
          description: 'Limpia transacciones con Flink, construye un pipeline de scoring y PII masking, y consulta los resultados desde un agente aislado por participante.',
          context: 'Beetech · IBM',
          metadata: {
            modality: 'Bootcamp guiado',
            duration: '~3 h',
            stack: 'Kafka · Flink · wxDI',
            stackTone: 'purple'
          },
          steps: [
            {
              slug: 'overview',
              label: 'Inicio',
              file: './content/integraciones/fraud-detection/overview.html',
              metadata: {
                platform: 'watsonx.data integration',
                modality: 'Bootcamp guiado',
                platformTone: 'purple'
              }
            },
            {
              slug: 'confluent',
              label: 'Confluent + Flink',
              file: './content/integraciones/fraud-detection/confluent.html',
              metadata: {
                platform: 'Confluent + Flink',
                modality: 'Exploración guiada',
                platformTone: 'blue'
              }
            },
            {
              slug: 'data-integration',
              label: 'watsonx.data integration',
              file: './content/integraciones/fraud-detection/data-integration.html',
              metadata: {
                platform: 'watsonx.data integration',
                modality: 'Hands-on',
                platformTone: 'purple'
              }
            },
            {
              slug: 'orchestrate',
              label: 'watsonx Orchestrate',
              file: './content/integraciones/fraud-detection/orchestrate.html',
              metadata: {
                platform: 'watsonx Orchestrate',
                modality: 'Hands-on',
                platformTone: 'teal'
              }
            }
          ]
        }
      ]
    }
  ]
};

export function findLab(slug) {
  for (const section of siteData.sections) {
    for (const lab of section.labs) {
      if (lab.slug === slug) return { section, lab };
    }
  }
  return null;
}

export function findStandalonePage(slug) {
  return standalonePages[slug] || null;
}
