-- Dados de fornecedores e produtos extraídos dos catálogos em PDF.
-- Curadoria manual (assistida) a partir dos PDFs — ver decisão registrada
-- na sessão: sem parser automático de PDF nesta fase.
--
-- Convenções adotadas na leitura dos catálogos:
-- * Quando o catálogo só nomeia um conector (ex.: "Cabo Tipo-C"), assumo
--   que a outra ponta é USB-A padrão (fonte/tomada), por ser o padrão do
--   segmento. Cabos com as duas pontas nomeadas (ex.: "Tipo-C / Lightning")
--   guardam as duas em conector_origem/conector_destino.
-- * "moq" aqui é a quantidade mínima informada no catálogo (em unidades).
-- * preco_unitario é sempre o preço por peça.

-- ============================================================
-- Fornecedor: KAID
-- ============================================================
insert into fornecedores (nome) values ('KAID')
  on conflict (nome) do nothing;

insert into produtos (categoria, codigo, nome, preco_unitario, moq, especificacoes, observacoes, fornecedor_id)
select v.categoria, v.codigo, v.nome, v.preco_unitario, v.moq, v.especificacoes, v.observacoes, f.id
from fornecedores f
join (values
    ('cabo', 'KD-355M', 'Cabo USB-A → Micro-USB', 3.50, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "3A", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-355A', 'Cabo USB-A → Lightning', 3.50, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "3A", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-355C', 'Cabo USB-A → Type-C', 3.50, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "3A", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-352M', 'Cabo USB-A → Micro-USB', 5.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "3A", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-352A', 'Cabo USB-A → Lightning', 5.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "3A", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-352C', 'Cabo USB-A → Type-C', 5.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "3A", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-2503M', 'Cabo USB-A → Micro-USB', 3.00, 600, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-TC30', 'Cabo USB-A → Type-C', 4.50, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "material": "Camada de gelatina; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-18S', 'Cabo USB-A → Micro-USB', 6.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-18A', 'Cabo USB-A → Lightning', 6.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-18C', 'Cabo USB-A → Type-C', 6.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-2511M', 'Cabo USB-A → Micro-USB', 5.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2511C', 'Cabo USB-A → Type-C', 5.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2511A', 'Cabo USB-A → Lightning', 5.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-100M', 'Cabo USB-A → Micro-USB', 10.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-100CL', 'Cabo Type-C → Lightning', 12.00, 400, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "6A", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2512S', 'Cabo USB-A → Micro-USB', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2512A', 'Cabo USB-A → Lightning', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2512C', 'Cabo USB-A → Type-C', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-354M', 'Cabo USB-A → Micro-USB', 11.00, 100, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 3, "amperagem": "30W/5V/5A"}'::jsonb, null),
    ('cabo', 'KD-353M', 'Cabo USB-A → Micro-USB', 8.00, 160, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "30W/5V/5A", "material": "Cabo reforçado"}'::jsonb, null),
    ('cabo', 'KD-331M', 'Cabo USB-A → Micro-USB', 5.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-330A', 'Cabo USB-A → Lightning', 9.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 3, "material": "Camada de gelatina; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-327C', 'Cabo USB-A → Type-C', 7.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 2, "material": "Camada de gelatina; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-327M', 'Cabo USB-A → Micro-USB', 7.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "material": "Camada de gelatina; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-327A', 'Cabo USB-A → Lightning', 7.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 2, "material": "Camada de gelatina; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-2522M', 'Cabo USB-A → Micro-USB', 8.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5V/3.4A", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-21M', 'Cabo USB-A → Micro-USB', 3.50, 600, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-351CL', 'Cabo Type-C → Lightning', 7.00, 200, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "30W/5V/5A", "material": "Carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-2501M', 'Cabo USB-A → Micro-USB', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; cor LED RGB"}'::jsonb, null),
    ('cabo', 'KD-28M', 'Cabo USB-A → Micro-USB', 3.50, 600, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-31M', 'Cabo USB-A → Micro-USB', 3.00, 600, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-335M', 'Cabo USB-A → Micro-USB', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento rápido"}'::jsonb, null),
    ('cabo', 'KD-26', 'Cabo Type-C → Lightning', 6.00, 600, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "PD 30W", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2518CC', 'Cabo Type-C → Type-C', 6.00, 400, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2518CL', 'Cabo Type-C → Lightning', 7.00, 400, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2521CL', 'Cabo Type-C → Lightning', 9.00, 200, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2521CC', 'Cabo Type-C → Type-C', 8.00, 200, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "material": "Extremidade reforçada; carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2504', 'Cabo Type-C → Type-C', 5.00, 400, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "PD", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2519M', 'Cabo USB-A → Micro-USB', 6.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5V/3.4A", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-101A', 'Cabo USB-A → Lightning', 11.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "2.4A", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-101C', 'Cabo USB-A → Type-C', 11.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "66W", "material": "LED indicador"}'::jsonb, null),
    ('cabo', 'KD-101CC', 'Cabo Type-C → Type-C', 12.00, 400, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "66W", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-101CL', 'Cabo Type-C → Lightning', 12.00, 400, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "27W", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2519CL', 'Cabo Type-C → Lightning', 8.00, 200, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "PD 30W", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-2519CC', 'Cabo Type-C → Type-C', 7.00, 200, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "PD 60W", "material": "Carregamento turbo"}'::jsonb, null),
    ('cabo', 'KD-103', 'Cabo Multiconector (Type-C + Lightning + Micro-USB)', 15.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Multiconector (Type-C + Lightning + Micro-USB)", "comprimento_m": 1.2, "amperagem": "PD", "material": "Cabo 4 em 1"}'::jsonb, null),
    ('cabo', 'KD-33', 'Cabo Multiconector (Type-C + Lightning + Micro-USB)', 8.00, 300, '{"conector_origem": "USB-A", "conector_destino": "Multiconector (Type-C + Lightning + Micro-USB)", "comprimento_m": 1, "material": "Cabo magnético; 3 em 1"}'::jsonb, null),
    ('cabo', 'KD-30', 'Cabo Multiconector (Type-C + Lightning + Micro-USB)', 6.00, 300, '{"conector_origem": "USB-A", "conector_destino": "Multiconector (Type-C + Lightning + Micro-USB)", "comprimento_m": 1, "material": "3 em 1"}'::jsonb, null),
    ('cabo', 'KD-2516', 'Cabo Multiconector (4 em 1)', 9.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Multiconector (4 em 1)", "comprimento_m": 1, "amperagem": "PD 60W", "material": "Carregamento turbo"}'::jsonb, null)
) as v(categoria, codigo, nome, preco_unitario, moq, especificacoes, observacoes) on true
where f.nome = 'KAID'
on conflict (fornecedor_id, codigo) do nothing;

-- ============================================================
-- Fornecedor: AGOLD
-- ============================================================
insert into fornecedores (nome) values ('AGOLD')
  on conflict (nome) do nothing;

insert into produtos (categoria, codigo, nome, preco_unitario, moq, especificacoes, observacoes, fornecedor_id)
select v.categoria, v.codigo, v.nome, v.preco_unitario, v.moq, v.especificacoes, v.observacoes, f.id
from fornecedores f
join (values
    ('cabo', 'CB120', 'Cabo Type-C → Type-C', 18.80, 300, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "60W", "material": "Com LED, exibe potência utilizada; linha Premium"}'::jsonb, null),
    ('cabo', 'CB121', 'Cabo Type-C → Type-C', 17.60, 300, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "27W", "material": "Com LED, exibe potência utilizada; linha Premium"}'::jsonb, null),
    ('cabo', 'CB113', 'Cabo Multiconector (Type-C + Lightning)', 12.00, 200, '{"conector_origem": "USB-A", "conector_destino": "Multiconector (Type-C + Lightning)", "comprimento_m": 1, "amperagem": "Type-C 60W / Lightning 30W", "material": "Cabo de dados 2 em 1; linha Premium"}'::jsonb, null),
    ('cabo', 'CB114', 'Cabo Type-C → Type-C', 10.00, 300, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "60W", "material": "Carregamento turbo; linha Premium"}'::jsonb, null),
    ('cabo', 'CB115', 'Cabo Type-C → Lightning', 11.20, 300, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "30W", "material": "Carregamento turbo; linha Premium"}'::jsonb, null),
    ('cabo', 'CB17', 'Cabo Type-C → Type-C', 8.00, 300, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "66W", "material": "Turbo; embalagem grande"}'::jsonb, null),
    ('cabo', 'CB18', 'Cabo Type-C → Lightning', 9.60, 300, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "30W", "material": "Turbo; embalagem grande"}'::jsonb, null),
    ('cabo', 'CB93', 'Cabo Type-C → Type-C', 6.40, 400, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "60W", "material": "Para carga e dados"}'::jsonb, null),
    ('cabo', 'CB-106', 'Cabo Type-C → Type-C', 12.00, 300, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "66W", "material": "LED de carregamento"}'::jsonb, null),
    ('cabo', 'CB-107', 'Cabo Type-C → Lightning', 15.20, 300, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "30W", "material": "LED de carregamento"}'::jsonb, null),
    ('cabo', 'CB91', 'Cabo Type-C → Type-C', 10.80, 200, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "60W max", "material": "Lâmpada LED"}'::jsonb, null),
    ('cabo', 'CB-51', 'Cabo Type-C → Type-C', 6.40, 400, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "9V3A / 60W", "material": "Para carga e dados"}'::jsonb, null),
    ('cabo', 'CB104', 'Cabo Type-C → Lightning', 8.40, 300, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 2, "amperagem": "30W", "material": "Dedicado iPhone 14 Pro Max"}'::jsonb, null),
    ('cabo', 'CB105', 'Cabo Type-C → Type-C', 7.20, 300, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 2, "amperagem": "60W", "material": "Dedicado iPhone 15 Pro Max"}'::jsonb, null),
    ('cabo', 'CB86', 'Cabo Type-C → Type-C', 6.40, 400, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "PD 66W"}'::jsonb, null),
    ('cabo', 'CB85', 'Cabo Type-C → Lightning', 8.31, 400, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "PD 30W max"}'::jsonb, null),
    ('cabo', 'CB87', 'Cabo Type-C → Lightning', 8.80, 400, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "PD 30W max", "material": "Acende luz enquanto carrega"}'::jsonb, null),
    ('cabo', 'CB88', 'Cabo Type-C → Type-C', 7.20, 400, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "PD 66W max", "material": "Acende luz enquanto carrega"}'::jsonb, null),
    ('cabo', 'CB-50', 'Cabo Type-C → Lightning', 6.80, 400, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "9V3A / 30W", "material": "Para carga e dados"}'::jsonb, null),
    ('cabo', 'CB78-1', 'Cabo USB-A → Micro-USB', 7.20, 300, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "20W", "material": "Luzes de mudança coloridas; embalagem grande"}'::jsonb, null),
    ('cabo', 'CB78-2', 'Cabo USB-A → Lightning', 8.00, 300, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "20W", "material": "Luzes de mudança coloridas; embalagem grande"}'::jsonb, null),
    ('cabo', 'CB66-1', 'Cabo USB-A → Micro-USB', 6.00, 300, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB110-2', 'Cabo USB-A → Lightning', 10.40, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "20W max", "material": "Conector 90°; Kirsite"}'::jsonb, null),
    ('cabo', 'CB110-3', 'Cabo USB-A → Type-C', 10.40, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "20W max", "material": "Conector 90°; Kirsite"}'::jsonb, null),
    ('cabo', 'CB67-1', 'Cabo USB-A → Micro-USB', 6.00, 300, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5.0A", "material": "Trançado em tecido; embalado"}'::jsonb, null),
    ('cabo', 'CB70', 'Cabo USB-A → Type-C', 4.80, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "5.0A", "material": "Chip inteligente"}'::jsonb, null),
    ('cabo', 'CB71', 'Cabo USB-A → Lightning', 5.20, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "5.0A", "material": "Chip inteligente"}'::jsonb, null),
    ('cabo', 'CB98-1', 'Cabo USB-A → Micro-USB', 4.40, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "20W", "material": "Turbo; chip inteligente"}'::jsonb, null),
    ('cabo', 'CB39-1', 'Cabo USB-A → Micro-USB', 6.09, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "25W", "material": "Com LED"}'::jsonb, null),
    ('cabo', 'CB39-2', 'Cabo USB-A → Lightning', 6.53, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "25W", "material": "Com LED"}'::jsonb, null),
    ('cabo', 'CB39-3', 'Cabo USB-A → Type-C', 6.18, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "25W", "material": "Com LED"}'::jsonb, null),
    ('cabo', 'CB117-1', 'Cabo USB-A → Micro-USB', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "25W", "material": "Fio de alta qualidade"}'::jsonb, null),
    ('cabo', 'CB117-2', 'Cabo USB-A → Lightning', 4.40, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "5A rápido", "material": "Fio de alta qualidade"}'::jsonb, null),
    ('cabo', 'CB117-3', 'Cabo USB-A → Type-C', 4.40, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "5A rápido", "material": "Fio de alta qualidade"}'::jsonb, null),
    ('cabo', 'CB04-1', 'Cabo USB-A → Micro-USB', 4.31, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB04-3', 'Cabo USB-A → Type-C', 4.76, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB33-1', 'Cabo USB-A → Micro-USB', 8.84, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 3, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB77-1', 'Cabo USB-A → Micro-USB', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "20W"}'::jsonb, null),
    ('cabo', 'CB77-2', 'Cabo USB-A → Lightning', 4.40, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "20W"}'::jsonb, null),
    ('cabo', 'CB77-3', 'Cabo USB-A → Type-C', 4.40, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "20W"}'::jsonb, null),
    ('cabo', 'CB111-1', 'Cabo USB-A → Micro-USB', 3.20, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "25W", "material": "Carga rápida"}'::jsonb, null),
    ('cabo', 'CB111-2', 'Cabo USB-A → Lightning', 3.60, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "5A", "material": "Carga rápida"}'::jsonb, null),
    ('cabo', 'CB111-3', 'Cabo USB-A → Type-C', 3.60, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "5A", "material": "Carga rápida"}'::jsonb, null),
    ('cabo', 'CB12-1', 'Cabo USB-A → Micro-USB', 3.20, 500, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB12-2', 'Cabo USB-A → Lightning', 3.60, 500, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB12-3', 'Cabo USB-A → Type-C', 3.60, 500, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB08-1', 'Cabo USB-A → Micro-USB', 3.29, 500, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5.0A", "material": "Não embalado"}'::jsonb, null),
    ('cabo', 'CB08-2', 'Cabo USB-A → Lightning', 3.51, 500, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "5.0A", "material": "Não embalado"}'::jsonb, null),
    ('cabo', 'CB08-3', 'Cabo USB-A → Type-C', 3.51, 500, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "5.0A", "material": "Não embalado"}'::jsonb, null),
    ('cabo', 'CB31-1', 'Cabo USB-A → Micro-USB', 3.56, 300, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB36-1', 'Cabo USB-A → Micro-USB', 4.40, 300, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A", "material": "Embalado; para carga e dados"}'::jsonb, null),
    ('cabo', 'CB72-1', 'Cabo USB-A → Micro-USB', 4.00, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5A max", "material": "Revestimento trançado; luz LED"}'::jsonb, null),
    ('cabo', 'CB103-1', 'Cabo USB-A → Micro-USB', 3.20, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5A", "material": "Carga rápida"}'::jsonb, null),
    ('cabo', 'CB10-1', 'Cabo USB-A → Micro-USB', 3.20, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "30W", "material": "OD 3.8"}'::jsonb, null),
    ('cabo', 'CB35-1', 'Cabo USB-A → Micro-USB', 3.96, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB15-1', 'Cabo USB-A → Micro-USB', 3.60, 500, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB15-3', 'Cabo USB-A → Type-C', 4.00, 500, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB37-1', 'Cabo USB-A → Micro-USB', 4.40, 300, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB17-1', 'Cabo USB-A → Micro-USB', 3.64, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB17-2', 'Cabo USB-A → Lightning', 4.18, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB17-3', 'Cabo USB-A → Type-C', 4.18, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB06-1', 'Cabo USB-A → Micro-USB', 3.29, 500, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB06-2', 'Cabo USB-A → Lightning', 3.64, 500, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB06-3', 'Cabo USB-A → Type-C', 3.64, 500, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB32-1', 'Cabo USB-A → Micro-USB', 7.51, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB32-2', 'Cabo USB-A → Lightning', 7.51, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 2, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB32-3', 'Cabo USB-A → Type-C', 7.51, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 2, "amperagem": "4.8A", "material": "Embalado"}'::jsonb, null),
    ('cabo', 'CB109-1', 'Cabo USB-A → Micro-USB', 4.40, 400, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "5A rápido", "material": "Fio de alta qualidade"}'::jsonb, null),
    ('cabo', 'CB109-2', 'Cabo USB-A → Lightning', 4.80, 400, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 2, "amperagem": "5A rápido", "material": "Fio de alta qualidade"}'::jsonb, null),
    ('cabo', 'CB109-3', 'Cabo USB-A → Type-C', 4.80, 400, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 2, "amperagem": "5A rápido", "material": "Fio de alta qualidade"}'::jsonb, null),
    ('cabo', 'CB13-1', 'Cabo USB-A → Micro-USB', 3.47, 500, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "4.8A"}'::jsonb, null),
    ('cabo', 'CB25-1', 'Cabo USB-A → Micro-USB', 4.09, 500, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 0.24, "amperagem": "2.1A max", "material": "Cabo curto tipo chaveiro; embalado"}'::jsonb, null),
    ('cabo', 'CB25-2', 'Cabo USB-A → Lightning', 4.76, 500, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 0.24, "amperagem": "2.1A max", "material": "Cabo curto tipo chaveiro; embalado"}'::jsonb, null),
    ('cabo', 'CB95-1', 'Cabo USB-A → Micro-USB', 6.09, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5A max", "material": "Carregamento inteligente"}'::jsonb, null),
    ('cabo', 'CB95-2', 'Cabo USB-A → Lightning', 6.53, 200, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "5A max", "material": "Carregamento inteligente"}'::jsonb, null),
    ('cabo', 'CB95-3', 'Cabo USB-A → Type-C', 6.53, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "5A max", "material": "Carregamento inteligente"}'::jsonb, null),
    ('cabo', 'CB26-1', 'Cabo USB-A → Micro-USB', 7.20, 200, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "20W / 480Mbps"}'::jsonb, null),
    ('cabo', 'CB26-3', 'Cabo USB-A → Type-C', 7.60, 200, '{"conector_origem": "USB-A", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "66W / 480Mbps"}'::jsonb, null),
    ('cabo', 'CB96', 'Cabo Type-C → Lightning', 6.98, 200, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "5A max / PD 30W", "material": "Turbo"}'::jsonb, null),
    ('cabo', 'CB29', 'Cabo Type-C → Lightning', 8.84, 200, '{"conector_origem": "Type-C", "conector_destino": "Lightning", "comprimento_m": 1, "amperagem": "30W"}'::jsonb, null),
    ('cabo', 'CB28', 'Cabo Type-C → Type-C', 8.31, 200, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "66W"}'::jsonb, null),
    ('cabo', 'CB97', 'Cabo Type-C → Type-C', 5.87, 200, '{"conector_origem": "Type-C", "conector_destino": "Type-C", "comprimento_m": 1, "amperagem": "5A max / PD 60W", "material": "Turbo"}'::jsonb, null),
    ('cabo', 'CB83-1', 'Cabo USB-A → Micro-USB', 6.44, 360, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "5.0A max", "material": "Trança de alta densidade; formato cápsula/chaveiro"}'::jsonb, null),
    ('cabo', 'CB81-1', 'Cabo USB-A → Micro-USB', 4.84, 480, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5.0A max", "material": "Trança de alta densidade; formato cápsula/chaveiro"}'::jsonb, null),
    ('cabo', 'CB84-1', 'Cabo USB-A → Micro-USB', 6.62, 360, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "5.0A max", "material": "Trança de alta densidade; formato cápsula/chaveiro"}'::jsonb, null),
    ('cabo', 'CB62-1', 'Cabo USB-A → Micro-USB', 5.96, 360, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "5.0A max", "material": "Trança de alta densidade; carregar e sincronizar"}'::jsonb, null),
    ('cabo', 'CB62-2', 'Cabo USB-A → Lightning', 6.31, 360, '{"conector_origem": "USB-A", "conector_destino": "Lightning", "comprimento_m": 2, "amperagem": "5.0A max", "material": "Trança de alta densidade; carregar e sincronizar"}'::jsonb, null),
    ('cabo', 'CB63-1', 'Cabo USB-A → Micro-USB', 5.96, 360, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 2, "amperagem": "5.0A max", "material": "Trança de alta densidade; carregar e sincronizar"}'::jsonb, null),
    ('cabo', 'CB61-1', 'Cabo USB-A → Micro-USB', 4.76, 480, '{"conector_origem": "USB-A", "conector_destino": "Micro-USB", "comprimento_m": 1, "amperagem": "5.0A max", "material": "Trança de alta densidade; carregar e sincronizar; formato chaveiro"}'::jsonb, null)
) as v(categoria, codigo, nome, preco_unitario, moq, especificacoes, observacoes) on true
where f.nome = 'AGOLD'
on conflict (fornecedor_id, codigo) do nothing;
