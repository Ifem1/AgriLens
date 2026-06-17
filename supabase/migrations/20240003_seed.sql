-- AgriLens — Seed Data: Crops

insert into public.crops (name, scientific_name, growth_stages) values
  ('Maize (Corn)',  'Zea mays',               array['Germination','Seedling','Vegetative','Tasseling','Silking','Grain Fill','Maturity']),
  ('Rice',          'Oryza sativa',            array['Germination','Seedling','Tillering','Jointing','Heading','Flowering','Grain Fill','Maturity']),
  ('Wheat',         'Triticum aestivum',       array['Germination','Seedling','Tillering','Stem Extension','Heading','Flowering','Grain Fill','Ripening']),
  ('Tomato',        'Solanum lycopersicum',    array['Germination','Seedling','Vegetative','Flowering','Fruit Set','Fruit Development','Maturity']),
  ('Cassava',       'Manihot esculenta',       array['Planting','Establishment','Vegetative Growth','Tuber Initiation','Tuber Bulking','Maturity']),
  ('Soybean',       'Glycine max',             array['Germination','Seedling','Vegetative','Flowering','Pod Development','Seed Fill','Maturity']),
  ('Cocoa',         'Theobroma cacao',         array['Nursery','Establishment','Vegetative','Flowering','Pod Development','Pod Maturity']),
  ('Banana',        'Musa spp.',               array['Planting','Vegetative','Flowering','Bunch Development','Maturity']),
  ('Yam',           'Dioscorea spp.',          array['Planting','Sprouting','Vine Growth','Tuber Initiation','Tuber Bulking','Maturity']),
  ('Coffee',        'Coffea arabica',          array['Nursery','Establishment','Vegetative','Flowering','Cherry Development','Cherry Maturity']),
  ('Sweet Potato',  'Ipomoea batatas',         array['Planting','Sprouting','Vine Growth','Tuber Initiation','Tuber Bulking','Maturity']),
  ('Groundnut',     'Arachis hypogaea',        array['Germination','Seedling','Vegetative','Flowering','Peg Formation','Pod Development','Maturity']),
  ('Pepper',        'Capsicum annuum',         array['Germination','Seedling','Vegetative','Flowering','Fruit Set','Fruit Development','Maturity']),
  ('Onion',         'Allium cepa',             array['Germination','Seedling','Bulbing','Maturity']),
  ('Plantain',      'Musa paradisiaca',        array['Planting','Vegetative','Flowering','Bunch Development','Maturity'])
on conflict (name) do nothing;
