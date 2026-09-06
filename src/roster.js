/* Who is in the game.

   PLAYERS are pickable before a shift and are never cuffed.
   EXECS are the pickups. Each one is baked twice: loose (holding whatever
   prop they carry) for when they're standing in the lot, and cuffed for once
   they've joined the line behind you. Their clothes stay the same either way,
   so the line reads as a row of recognisable individuals. */
(function (PW) {
  'use strict';

  /* One officer, no picker: plain municipal police so the role reads at a
     glance - navy uniform, capped shield, duty belt. Skin tone, build and
     colours are all single-value changes here. */
  /* Four people who might plausibly be serving a warrant. Each leans on a
     different silhouette cue so they stay apart at 24px: cap, swoop, wide hat,
     shades. None is ever cuffed. */
  PW.PLAYERS = [
    {
      id: 'officer', name: 'OFFICER',
      skin: 'tan', build: 'normal', hair: 'dark', hairStyle: 'buzz',
      hat: 'police', hatColor: '#1f2942', brows: 'thin',
      shirt: '#33436b', sleeves: 'long', belt: '#141821', badge: true,
      pants: '#232c42', shoes: '#141821'
    },
    {
      id: 'detective', name: 'DETECTIVE',
      skin: 'peach', build: 'normal', face: 'tapered', hair: 'brown', hairStyle: 'swoop',
      brows: 'arched',
      shirt: '#8a7550', lapels: '#6d5b3c', sleeves: 'long', tie: '#7a2f3a',
      belt: '#3b2f22', badge: true,
      pants: '#4a4034', shoes: '#2a231b',
      eyeColor: '#3f6b52', makeup: ['top', 'bottom', 'outer'], makeupColor: '#6b4a72', makeupColor2: '#3d2a40'
    },
    {
      id: 'marshal', name: 'MARSHAL',
      skin: 'brown', build: 'heavy', face: 'broad', hair: 'black', hairStyle: 'crop',
      hat: 'cowboy', hatColor: '#4a3a28', brows: 'thick',
      shirt: '#5d6b52', sleeves: 'long', belt: '#2d2318', badge: true,
      pants: '#3b4235', shoes: '#2a231b'
    },
    {
      id: 'agent', name: 'AGENT',
      skin: 'pale', build: 'lean', face: 'slim', hair: 'black', hairStyle: 'slick',
      brows: 'angled', glasses: 'aviator',
      shirt: '#1f242e', lapels: '#141821', sleeves: 'long', tie: '#2b3550',
      pants: '#1f242e', shoes: '#141821'
    }
  ];

  // Kept as a name for the default, for anything that wants just the one.
  PW.OFFICER = PW.PLAYERS[0];

  PW.EXECS = [
    {
      id: 'pharma', name: 'PHARMA BRO',
      skin: 'pale', build: 'lean', face: 'slim', hair: 'dark', hairStyle: 'slick',
      brows: 'angled',
      shirt: '#26324f', lapels: '#1a2338', sleeves: 'long',
      pants: '#4a5262', shoes: '#22262f', prop: 'pills'
    },
    {
      id: 'crypto', name: 'CRYPTO FOUNDER',
      skin: 'peach', build: 'normal', hair: 'brown', hairStyle: 'crop',
      hat: 'beanie', hatColor: '#5b6478',
      shirt: '#1d2129', sleeves: 'short', graphic: 'bolt', graphicColor: '#e4c06a',
      pants: '#39404f', shoes: '#e8edf5', prop: 'laptop'
    },
    {
      id: 'oil', name: 'OIL BARON',
      skin: 'tan', build: 'heavy', face: 'broad', hair: 'grey', hairStyle: 'crop',
      hat: 'cowboy', hatColor: '#c6a677', brows: 'thick',
      shirt: '#d8c8a4', lapels: '#b8a67e', sleeves: 'long', chain: true,
      pants: '#6b5334', shoes: '#5c3d21'
    },
    {
      id: 'equity', name: 'PE VULTURE',
      skin: 'pale', build: 'lean', face: 'slim', hair: 'grey', hairStyle: 'slick',
      brows: 'thin', glasses: 'halfRim',
      shirt: '#2d323d', pattern: 'stripes', patternColor: '#454b59', sleeves: 'long', tie: '#8e2b3a',
      pants: '#2d323d', shoes: '#181c24', prop: 'briefcase'
    },
    {
      id: 'slumlord', name: 'SLUMLORD',
      skin: 'olive', build: 'heavy', face: 'broad', hairStyle: 'bald',
      brows: 'thick',
      shirt: '#8e4a4a', sleeves: 'short', graphic: 'smiley', graphicColor: '#e4c06a',
      pants: '#4a5262', shoes: '#3b2f22', prop: 'keyring'
    },
    {
      id: 'tobacco', name: 'TOBACCO LOBBYIST',
      skin: 'pale', build: 'normal', hair: 'white', hairStyle: 'slick',
      brows: 'thin', glasses: 'square',
      shirt: '#6a7183', sleeves: 'long', tie: '#8e2b3a', lapels: '#565d6d',
      pants: '#565d6d', shoes: '#22262f', prop: 'cigar'
    },
    {
      id: 'payday', name: 'PAYDAY LENDER',
      skin: 'brown', build: 'normal', hair: 'black', hairStyle: 'crop',
      hat: 'cap', hatColor: '#c0392b',
      shirt: '#c9a24e', sleeves: 'long', chain: true,
      pants: '#2d323d', shoes: '#e8edf5', prop: 'phone'
    },
    {
      id: 'wellness', name: 'WELLNESS GRIFTER',
      skin: 'olive', build: 'lean', face: 'round', hair: 'blonde', hairStyle: 'long',
      brows: 'arched', makeup: ['top'], makeupColor: '#8a7a4a',
      shirt: '#e6dcc4', sleeves: 'long', graphic: 'flower', graphicColor: '#6fae4b',
      pants: '#cbbfa2', shoes: '#8a6948', prop: 'cup'
    },
    {
      id: 'defense', name: 'DEFENSE CONTRACTOR',
      skin: 'deep', build: 'normal', hair: 'black', hairStyle: 'crop',
      brows: 'thick',
      shirt: '#565d6d', lapels: '#454b59', sleeves: 'long', badge: true,
      pants: '#454b59', shoes: '#181c24', prop: 'briefcase'
    },
    {
      id: 'con-man', name: 'CON MAN',
      skin: 'amber', build: 'normal', face: 'square', hair: 'blonde', hairStyle: 'swoop',
      brows: 'thin', makeup: ['bottom', 'inner'], makeupColor: '#d2b8a7',
      shirt: '#1a2d5b', sleeves: 'long', tie: '#b80000',
      pants: '#1a2d5b', shoes: '#141821'
    },
    {
      id: 'casino', name: 'CASINO BOSS',
      skin: 'peach', build: 'heavy', face: 'broad', hair: 'black', hairStyle: 'slick',
      brows: 'thick', glasses: 'roundShades',
      shirt: '#6d2436', lapels: '#4e1926', sleeves: 'long', chain: true,
      pants: '#1d2129', shoes: '#181c24', prop: 'cigar'
    }
  ];

  PW.art = { players: [], execs: [] };

  PW.bakeAll = function () {
    PW.art.players = PW.PLAYERS.map(function (d) { return PW.bake(d, { cuffed: false }); });
    PW.art.execs = PW.EXECS.map(function (d) {
      return {
        loose: PW.bake(d, { cuffed: false }).front,
        cuffed: PW.bake(d, { cuffed: true })
      };
    });
  };
})(window.PW);
