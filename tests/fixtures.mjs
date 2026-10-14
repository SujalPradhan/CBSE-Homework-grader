// Complete, honest answer sheets for each task (simulated test data, not real students).
export const HONEST = {
  handspan: {
    pred: 'The adult', hs1: 16, n1: 9.5, hs2: 21, n2: 7, L: 150,
    gap: 'Adult handspan 21 times 7 is 147 cm, close to 150. Not exact because my hand was not end to end.',
    why: 'The adult has a bigger hand 21 cm, so fewer handspans, 7 not 9.5. With my ruler the adult would also get 150 cm, because cm are the same for everybody.',
    shop: 'Four of my handspans is 64 cm and four of the adult is 84 cm. The seller should use a metre scale so everyone gets the same.',
    family: 'My mother asked why the numbers were different and I said our hands are different sizes so we need cm.',
  },
  pendulum: {
    pred: 'Double', p50: 15, t1a: 10.2, t1b: 9.9, t2a: 20.3, t2b: 19.8, t3: 14.3, mass: 'Did not change much',
    hard: 'Counting when to start. I dropped it from the side and counted when it came back to the same side.',
    why: 'My guess double was right. 4 times longer thread took 2 times as long, 10 s to 20 s. 50 cm took 14.3 s, not halfway between 10 and 20 which is 15.',
    apply: 'Shorter. My longer 100 cm pendulum took longer for each swing, so a clock running slow needs a shorter pendulum.',
    family: 'Dad asked if the heavy stone changes it. I said no, I tried it and the time was the same.',
  },
  salt: {
    pred: 5, n: 6, bottom: 'I guessed it would stay. When I added water some of the leftover salt dissolved and some stayed.', taste: 'Salty',
    off: 'I guessed 5 and got 6, close. I thought it would be less.',
    sort: '1 Not tested, I cannot see particles. 2 Disagrees, after 6 spoons salt stayed at the bottom. 3 Disagrees, the clear water tasted salty. 4 Not tested, I did not change temperature.',
    fix: 'Salt dissolves until the water is saturated, then extra salt stays at the bottom, so more stirring does not dissolve more.',
    design: 'Two glasses with the same amount of water, one cold one warm, add sugar spoon by spoon in each and count spoons. Keep water amount and spoon same, change only temperature.',
    family: 'Granny asked if the salt was gone. I said it is still there because the water tasted salty.',
  },
  paper: {
    pred: 0.1, one: 'My ruler could not show it, one sheet looks like nothing.', h50: 4.5, h100: 9, t50: 0.09, t100: 0.09,
    better: 'If 0.5 mm too tall: 50 sheets 5.0 mm gives 0.100, moved 0.010. 100 sheets 9.5 gives 0.095, moved 0.005. The 100 stack moved less so I trust it more.',
    book: 'Science book. 8 mm thick so about 90 sheets so 180 pages. The last page number was 192, close, a few pages not numbered.',
    family: 'My brother asked why not measure one sheet. I said the ruler is too coarse so I measure many and divide.',
  },
  sweet: {
    a: 3, pred: 'Less sweet than A', b: 6, words: 'Taster said B and A same, C was watery, least sweet.', dcups: 3, dspoons: 9,
    dtaste: 'D tasted the same as A, taster said same.', cups: 1.67,
    ratios: 'A is 1 : 3, B is 2 : 6 which is 1 : 3 so A :: B. C is 2 : 4 which is 1 : 2, different.',
    why: 'C needs 2 more spoons, 6 total, because 2 cups need 2 times 3 spoons. I added 2 and then it tasted like A.',
    family: 'Mum asked why not just add one spoon. I said that is adding, but the water doubled so the sugar must double too.',
  },
};
