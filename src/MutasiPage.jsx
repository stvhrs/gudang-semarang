import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout, Card, Table, Tag, Button, Modal, Form, Input, InputNumber,
  DatePicker, Radio, Select, Upload, Space, FloatButton, Typography, Row, Col, Divider,
  message, Tooltip, Empty
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, SyncOutlined,
  MoneyCollectOutlined ,
} from '@ant-design/icons';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
     apiKey: "AIzaSyANgoNbU3mvcZItj5_y0x581lAkZPQiaVU",
  authDomain: "elkapededigital.firebaseapp.com",
  databaseURL: "https://elkapededigital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "elkapededigital",
  storageBucket: "elkapededigital.appspot.com",
  messagingSenderId: "921510245995",
  appId: "1:921510245995:web:db96c6ab76c49e8b31a32e",
  measurementId: "G-L6CXY04E12"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// Set locale for dayjs
dayjs.locale('id');

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// ====================== ENUM / CONSTANT ======================
const TipeTransaksi = {
  pemasukan: 'pemasukan',
  pengeluaran: 'pengeluaran',
};

const KategoriPemasukan = {
  transaksi_buku: 'Transaksi Buku',
  transaksi_jasa: 'Transaksi Jasa',
  penerimaan_piutang: 'Penerimaan Piutang',
};

const KategoriPengeluaran = {
  operasional: 'Operasional',
  gaji_karyawan: 'Gaji Karyawan',
  pembayaran_hutang: 'Pembayaran Hutang',
  biaya_cetak_buku: 'Biaya Cetak Buku',
  komisi_sales: 'Komisi Sales',
  biaya_pengiriman: 'Biaya Pengiriman',
  pengadaan_fasilitas: 'Pengadaan Fasilitas',
};

// ====================== FORM MODAL ======================
const TransaksiForm = ({ open, onCancel, onFinish, initialValues }) => {
  const [form] = Form.useForm();
  const [tipe, setTipe] = useState(initialValues?.tipe || TipeTransaksi.pemasukan);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue({
        ...initialValues,
        tanggal: initialValues.tanggal ? dayjs(initialValues.tanggal) : dayjs(),
        jumlah: Math.abs(initialValues.jumlah || 0)
      });
      setTipe(initialValues.tipe || TipeTransaksi.pemasukan);
      if (initialValues.buktiUrl) {
        setFileList([
          { uid: '-1', name: 'File terlampir', status: 'done', url: initialValues.buktiUrl, thumbUrl: initialValues.buktiUrl }
        ]);
      } else {
        setFileList([]);
      }
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({ tipe: TipeTransaksi.pemasukan, tanggal: dayjs(), kategori: 'transaksi_buku' });
      setTipe(TipeTransaksi.pemasukan);
      setFileList([]);
    }
  }, [initialValues, form, open]);

  const handleTipeChange = (e) => {
    const newTipe = e.target.value;
    setTipe(newTipe);
    form.setFieldsValue({
      kategori: newTipe === TipeTransaksi.pemasukan ? 'transaksi_buku' : 'operasional'
    });
  };

  const normFile = (e) => {
    if (Array.isArray(e)) return e;
    return e && e.fileList;
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  return (
    <Modal
      open={open}
      title={initialValues ? 'Edit Transaksi' : 'Tambah Transaksi'}
      okText="Simpan"
      cancelText="Batal"
      onCancel={onCancel}
      onOk={() => {
        form.validateFields().then(values => {
          onFinish(values);
        }).catch(info => {
          console.log('Validate Failed:', info);
        });
      }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        name="transaksi_form"
        initialValues={{ tipe: TipeTransaksi.pemasukan, tanggal: dayjs() }}
      >
        <Form.Item
          name="tanggal"
          label="Tanggal Transaksi"
          rules={[{ required: true, message: 'Tanggal wajib diisi!' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="jumlah"
          label="Jumlah"
          rules={[
            { required: true, message: 'Jumlah wajib diisi!' },
            { type: 'number', min: 1, message: 'Jumlah harus lebih dari 0' }
          ]}
        >
          <InputNumber
            prefix="Rp "
            style={{ width: '100%' }}
            formatter={(v) =>
              (v ?? '')
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }
            parser={(v) => (v ?? '').toString().replace(/[^\d]/g, '')}
          />
        </Form.Item>

        <Form.Item
          name="keterangan"
          label="Keterangan"
          rules={[{ required: true, message: 'Keterangan wajib diisi!' }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="tipe" label="Tipe Transaksi">
          <Radio.Group onChange={handleTipeChange}>
            <Radio.Button value={TipeTransaksi.pemasukan}>Pemasukan</Radio.Button>
            <Radio.Button value={TipeTransaksi.pengeluaran}>Pengeluaran</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="kategori"
          label="Kategori"
          rules={[{ required: true, message: 'Kategori wajib diisi!' }]}
        >
          <Select placeholder="Pilih kategori">
            {(tipe === TipeTransaksi.pemasukan ? Object.entries(KategoriPemasukan) : Object.entries(KategoriPengeluaran))
              .map(([key, value]) => (
                <Select.Option key={key} value={key}>{value}</Select.Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Bukti Transaksi (Opsional)"
          name="bukti"
          valuePropName="fileList"
          getValueFromEvent={normFile}
        >
          <Upload
            name="bukti"
            customRequest={({ onSuccess }) => onSuccess && onSuccess("ok")}
            maxCount={1}
            fileList={fileList}
            onChange={handleUploadChange}
            accept="image/*,.pdf"
          >
            <Button icon={<UploadOutlined />}>Pilih File</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ====================== MUTASI PAGE COMPONENT ======================
const MutasiPage = () => {
  const [transaksiList, setTransaksiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: null,
    selectedTipe: [],
    selectedKategori: [],
    searchText: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaksi, setEditingTransaksi] = useState(null);

  // ---- Handlers umum ----
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSelectFilter = (key, value) => {
    setFilters(prev => {
      const currentSelection = prev[key];
      const newSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return { ...prev, [key]: newSelection };
    });
  };

  const resetFilters = () => {
    setFilters({
      dateRange: null,
      selectedTipe: [],
      selectedKategori: [],
      searchText: '',
    });
  };

  // ---- Fetch data Firebase ----
  useEffect(() => {
    const transaksiRef = ref(db, 'transaksi');
    const unsubscribeTransaksi = onValue(transaksiRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTransaksi = [];
      if (data) {
        for (const key in data) {
          loadedTransaksi.push({ id: key, ...data[key] });
        }
      }
      loadedTransaksi.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      setTransaksiList(loadedTransaksi);
      setLoading(false);
    });

    return () => {
      unsubscribeTransaksi();
    };
  }, []);
  
  // ---- Filtered list ----
  const filteredTransaksi = useMemo(() => {
    if (!transaksiList) return [];
    
    const sortedAllTx = [...transaksiList].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const balanceMap = new Map();
    let currentBalance = 0;
    for(const tx of sortedAllTx) {
        currentBalance += tx.jumlah;
        balanceMap.set(tx.id, currentBalance);
    }

    return transaksiList.filter(tx => {
      const tgl = dayjs(tx.tanggal);
      const [startDate, endDate] = filters.dateRange || [null, null];

      const inDate =
        !startDate ||
        (tgl.isAfter(startDate.startOf('day')) && tgl.isBefore(endDate.endOf('day')));

      const inTipe =
        filters.selectedTipe.length === 0 || filters.selectedTipe.includes(tx.tipe);

      const inKategori =
        filters.selectedKategori.length === 0 || filters.selectedKategori.includes(tx.kategori);
        
      const inSearch =
        filters.searchText === '' ||
        tx.keterangan.toLowerCase().includes(filters.searchText.toLowerCase());

      return inDate && inTipe && inKategori && inSearch;
    }).map(tx => ({...tx, saldoSetelah: balanceMap.get(tx.id)}));

  }, [transaksiList, filters]);


  const isFilterActive =
    !!filters.dateRange || filters.selectedTipe.length > 0 || filters.selectedKategori.length > 0 || filters.searchText !== '';

  // ---- CRUD ----
  const handleTambah = () => {
    setEditingTransaksi(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingTransaksi(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Konfirmasi Hapus',
      content: 'Apakah Anda yakin ingin menghapus transaksi ini? Saldo akan dihitung ulang oleh sistem.',
      okText: 'Hapus',
      okType: 'danger',
      onOk: async () => {
        try {
          await remove(ref(db, `transaksi/${id}`));
          message.success('Transaksi berhasil dihapus');
        } catch (error) {
          message.error('Gagal menghapus transaksi');
        }
      },
    });
  };

  const handleFinishForm = async (values) => {
    message.loading({ content: 'Menyimpan...', key: 'saving' });
    try {
      let buktiUrl = editingTransaksi?.buktiUrl || null;

      if (values.bukti && values.bukti.length > 0 && values.bukti[0].originFileObj) {
        const file = values.bukti[0].originFileObj;
        const fileName = `${uuidv4()}-${file.name}`;
        const fileRef = storageRef(storage, `bukti_transaksi/${fileName}`);
        await uploadBytes(fileRef, file);
        buktiUrl = await getDownloadURL(fileRef);
      } else if (!values.bukti || values.bukti.length === 0) {
        buktiUrl = null;
      }

      let jumlah = Number(values.jumlah);
      if (values.tipe === TipeTransaksi.pengeluaran) {
        jumlah = -Math.abs(jumlah);
      }

      const transaksiData = {
        tanggal: values.tanggal.valueOf(),
        jumlah,
        keterangan: values.keterangan,
        tipe: values.tipe,
        kategori: values.kategori,
        buktiUrl: buktiUrl,
      };

      if (editingTransaksi) {
        await update(ref(db, `transaksi/${editingTransaksi.id}`), transaksiData);
        message.success({ content: 'Transaksi berhasil diperbarui', key: 'saving', duration: 2 });
      } else {
        await push(ref(db, 'transaksi'), transaksiData);
        message.success({ content: 'Transaksi berhasil ditambahkan', key: 'saving', duration: 2 });
      }
      setIsModalOpen(false);
      setEditingTransaksi(null);
    } catch (error) {
      console.error("Error saving transaction: ", error);
      message.error({ content: 'Terjadi kesalahan saat menyimpan data', key: 'saving', duration: 2 });
    }
  };

  // ---- Utilities ----
  const currencyFormatter = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  // ---- Table ----
  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      render: (tgl) => dayjs(tgl).format('DD MMM YYYY'),
      sorter: (a, b) => a.tanggal - b.tanggal,
      defaultSortOrder: 'descend',
      width: 140
    },
    {
      title: 'Jenis Transaksi',
      dataIndex: 'kategori',
      key: 'kategori',
      render: (kategori, record) => {
        const kategoriText = record.tipe === 'pemasukan'
          ? KategoriPemasukan[kategori] || kategori.replace(/_/g, ' ')
          : KategoriPengeluaran[kategori] || kategori.replace(/_/g, ' ');
        return (
          <Tag color={record.tipe === 'pemasukan' ? 'green' : 'red'}>{kategoriText}</Tag>
        );
      },
      width: 200
    },
    { title: 'Keterangan', dataIndex: 'keterangan', key: 'keterangan' },
    {
      title: 'Nominal',
      dataIndex: 'jumlah',
      key: 'jumlah',
      align: 'right',
      render: (jml) => <Text type={jml >= 0 ? 'success' : 'danger'}>{currencyFormatter(jml)}</Text>,
      sorter: (a, b) => a.jumlah - b.jumlah,
      width: 180
    },
    {
      title: 'Saldo Akhir',
      dataIndex: 'saldoSetelah',
      key: 'saldoSetelah',
      align: 'right',
      render: (saldo) => (saldo !== null && saldo !== undefined)
        ? currencyFormatter(saldo)
        : <Text type="secondary">-</Text>,
      sorter: (a, b) => (a.saldoSetelah || 0) - (b.saldoSetelah || 0),
      width: 180
    },
    {
      title: 'Aksi',
      key: 'aksi',
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title={record.buktiUrl ? "Lihat Bukti" : "Tidak ada bukti"}>
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              href={record.buktiUrl} 
              target="_blank"
              disabled={!record.buktiUrl}
            />
          </Tooltip>
          <Tooltip title="Edit Transaksi">
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Hapus Transaksi">
            <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
      width: 140
    },
  ];

  // ---- Rekap Card ----
  const RekapitulasiCard = ({ data }) => {
    const pemasukanByCategory = data
      .filter(tx => tx.tipe === TipeTransaksi.pemasukan)
      .reduce((acc, tx) => {
        const kategoriNama = KategoriPemasukan[tx.kategori] || tx.kategori;
        acc[kategoriNama] = (acc[kategoriNama] || 0) + tx.jumlah;
        return acc;
      }, {});

    const pengeluaranByCategory = data
      .filter(tx => tx.tipe === TipeTransaksi.pengeluaran)
      .reduce((acc, tx) => {
        const kategoriNama = KategoriPengeluaran[tx.kategori] || tx.kategori;
        acc[kategoriNama] = (acc[kategoriNama] || 0) + Math.abs(tx.jumlah);
        return acc;
      }, {});

    const totalPemasukan = Object.values(pemasukanByCategory).reduce((sum, val) => sum + val, 0);
    const totalPengeluaran = Object.values(pengeluaranByCategory).reduce((sum, val) => sum + val, 0);

    return (
      <Card style={{ height: '100%' }}>
        <Title level={5}>Rekapitulasi Filter</Title>
        <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
          <Title level={5} style={{ color: 'green', marginTop: '20px' }}>Pemasukan</Title>
          <Divider style={{ marginTop: 0, marginBottom: 12 }} />
          {Object.keys(pemasukanByCategory).length > 0 ? (
            Object.entries(pemasukanByCategory).map(([kategori, jumlah]) => (
              <Row key={kategori} justify="space-between" style={{ marginBottom: 8 }}>
                <Col><Text>{kategori}</Text></Col>
                <Col><Text strong>{currencyFormatter(jumlah)}</Text></Col>
              </Row>
            ))
          ) : <Text type="secondary">Tidak ada pemasukan.</Text>}

          <Title level={5} style={{ color: 'red', marginTop: '20px' }}>Pengeluaran</Title>
          <Divider style={{ marginTop: 0, marginBottom: 12 }} />
          {Object.keys(pengeluaranByCategory).length > 0 ? (
            Object.entries(pengeluaranByCategory).map(([kategori, jumlah]) => (
              <Row key={kategori} justify="space-between" style={{ marginBottom: 8 }}>
                <Col><Text>{kategori}</Text></Col>
                <Col><Text strong>{currencyFormatter(jumlah)}</Text></Col>
              </Row>
            ))
          ) : <Text type="secondary">Tidak ada pengeluaran.</Text>}
        </div>
        
        <Divider />
        <Row justify="space-between">
          <Col><Text strong>Total Pemasukan</Text></Col>
          <Col><Text strong style={{ color: 'green' }}>{currencyFormatter(totalPemasukan)}</Text></Col>
        </Row>
        <Row justify="space-between" style={{ marginTop: 8 }}>
          <Col><Text strong>Total Pengeluaran</Text></Col>
          <Col><Text strong style={{ color: 'red' }}>{currencyFormatter(totalPengeluaran)}</Text></Col>
        </Row>
      </Card>
    );
  };
  
  const chipStyle = { 
    border: '1px solid #d9d9d9', 
    padding: '4px 10px', 
    borderRadius: '16px' 
  };

  // ---- Kategori Chips ----
  const KategoriChips = ({ kategoriMap, onSelect, selectedKategori }) => (
    <Space wrap>
      {Object.entries(kategoriMap).map(([key, value]) => (
        <Tag.CheckableTag
          key={key}
          checked={selectedKategori.includes(key)}
          onChange={() => onSelect('selectedKategori', key)}
          style={chipStyle}
        >
          {value}
        </Tag.CheckableTag>
      ))}
    </Space>
  );
  
  const selectedPemasukanStyle = { ...chipStyle, backgroundColor: '#d9f7be', borderColor: '#b7eb8f' };
  const selectedPengeluaranStyle = { ...chipStyle, backgroundColor: '#fff1f0', borderColor: '#ffa39e' };

  // ====================== RENDER ======================
  return (
    <Content
        style={{
        padding: '24px',
        backgroundColor: '#f0f2f5',
        }}
    >
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <Title level={3} style={{ marginTop: 0 }}>Mutasi Keuangan</Title>
        <Paragraph type="secondary">
            Kelola dan pantau semua transaksi keuangan masuk dan keluar dengan mudah.
        </Paragraph>

        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
            <Card style={{ height: '100%' }}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Filter Transaksi</Title>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <RangePicker
                        style={{ width: '100%' }}
                        onChange={(dates) => handleFilterChange('dateRange', dates)}
                        value={filters.dateRange}
                        placeholder={['Tanggal Mulai', 'Tanggal Selesai']}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                       <Input.Search
                        placeholder="Cari berdasarkan keterangan..."
                        value={filters.searchText}
                        onChange={(e) => handleFilterChange('searchText', e.target.value)}
                        onSearch={(value) => handleFilterChange('searchText', value)}
                        allowClear
                        style={{ width: '100%' }}
                      />
                    </Col>
                  </Row>
                  

                  <div>
                    <Text strong>Tipe Transaksi:</Text>
                    <div style={{ marginTop: 8 }}>
                        <Space wrap>
                        <Tag.CheckableTag
                            checked={filters.selectedTipe.includes(TipeTransaksi.pemasukan)}
                            onChange={() => handleMultiSelectFilter('selectedTipe', TipeTransaksi.pemasukan)}
                            style={filters.selectedTipe.includes(TipeTransaksi.pemasukan) ? selectedPemasukanStyle : chipStyle}
                        >
                            Pemasukan
                        </Tag.CheckableTag>
                        <Tag.CheckableTag
                            checked={filters.selectedTipe.includes(TipeTransaksi.pengeluaran)}
                            onChange={() => handleMultiSelectFilter('selectedTipe', TipeTransaksi.pengeluaran)}
                            style={filters.selectedTipe.includes(TipeTransaksi.pengeluaran) ? selectedPengeluaranStyle : chipStyle}
                        >
                            Pengeluaran
                        </Tag.CheckableTag>
                        </Space>
                    </div>
                  </div>

                  {(filters.selectedTipe.length === 0 || filters.selectedTipe.includes(TipeTransaksi.pemasukan)) && (
                    <div>
                        <Text strong>Kategori Pemasukan:</Text>
                        <div style={{ marginTop: 8 }}>
                        <KategoriChips
                            kategoriMap={KategoriPemasukan}
                            onSelect={handleMultiSelectFilter}
                            selectedKategori={filters.selectedKategori}
                        />
                        </div>
                    </div>
                  )}

                  {(filters.selectedTipe.length === 0 || filters.selectedTipe.includes(TipeTransaksi.pengeluaran)) && (
                    <div>
                        <Text strong>Kategori Pengeluaran:</Text>
                        <div style={{ marginTop: 8 }}>
                        <KategoriChips
                            kategoriMap={KategoriPengeluaran}
                            onSelect={handleMultiSelectFilter}
                            selectedKategori={filters.selectedKategori}
                        />
                        </div>
                    </div>
                  )}

                  {isFilterActive && (
                    <Button icon={<SyncOutlined />} onClick={resetFilters} style={{ width: 'fit-content' }}>
                        Reset Filter
                    </Button>
                  )}
                </Space>
            </Card>
            </Col>
            <Col xs={24} lg={10}>
            {isFilterActive ? <RekapitulasiCard data={filteredTransaksi} /> : (
                <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description={<Text type="secondary">Pilih filter untuk melihat rekapitulasi</Text>} />
                </Card>
            )}
            </Col>
        </Row>

        <Card>
            <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Daftar Transaksi</Title>
            <Table
            columns={columns}
            dataSource={filteredTransaksi}
            loading={loading}
            rowKey="id"
            size="middle"
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} transaksi` }}
            />
        </Card>
        </div>

        <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip="Tambah Transaksi Baru"
        onClick={handleTambah}
        />

        <TransaksiForm
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setEditingTransaksi(null); }}
        onFinish={handleFinishForm}
        initialValues={editingTransaksi}
        />
    </Content>
  );
};

export default MutasiPage;
