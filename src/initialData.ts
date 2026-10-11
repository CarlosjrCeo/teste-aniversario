import { PartyData } from './types.js';

export const initialPartyData: PartyData = {
  settings: {
    title: 'Carlos & José • 60 Anos',
    subtitle: 'Comemoração especial dos 60 anos no dia 28 de Novembro de 2026!',
    eventDate: '2026-11-28',
    eventTime: '18:00',
    locationName: 'Espaço de Eventos',
    address: 'Av. Principal, 1000 - Salão Nobre',
    mapsUrl: 'https://maps.google.com/?q=Espaco+de+Eventos',
    deadlineDate: '2026-11-15',
    welcomeMessage: 'É uma imensa alegria ter você e sua família conosco! Por favor, digite seu nome abaixo para confirmar quem poderá comparecer.',
    adminPin: '1234',
  },
  families: [
    {
      id: 'fam_1',
      familyName: 'Família Silva',
      phone: '11987654321',
      members: [
        { id: 'm_1_1', name: 'Carlos Silva', isAttending: null, isChild: false },
        { id: 'm_1_2', name: 'Mariana Silva', isAttending: null, isChild: false },
        { id: 'm_1_3', name: 'Lucas Silva', isAttending: null, isChild: true },
        { id: 'm_1_4', name: 'Beatriz Silva', isAttending: null, isChild: true },
      ],
    },
    {
      id: 'fam_2',
      familyName: 'Família Santos',
      phone: '11976543210',
      lastUpdated: '2026-10-10T14:32:00.000Z',
      confirmedBy: 'Roberto Santos',
      message: 'Com certeza estaremos lá para brindar com o Lalo e o Sassá!',
      members: [
        { id: 'm_2_1', name: 'Roberto Santos', isAttending: true, isChild: false },
        { id: 'm_2_2', name: 'Camila Santos', isAttending: true, isChild: false, dietaryRestrictions: 'Vegetariana' },
        { id: 'm_2_3', name: 'Gabriel Santos', isAttending: true, isChild: false },
        { id: 'm_2_4', name: 'Juliana Santos', isAttending: true, isChild: false },
        { id: 'm_2_5', name: 'Theo Santos', isAttending: false, isChild: true },
      ],
    },
    {
      id: 'fam_3',
      familyName: 'Família Oliveira',
      phone: '11965432109',
      members: [
        { id: 'm_3_1', name: 'André Oliveira', isAttending: null, isChild: false },
        { id: 'm_3_2', name: 'Patrícia Oliveira', isAttending: null, isChild: false },
      ],
    },
  ],
};
