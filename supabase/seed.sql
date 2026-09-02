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
