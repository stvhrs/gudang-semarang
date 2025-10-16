import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layout, Menu, Card, Table, Tag, Button, Modal, Form, Input, InputNumber,
  DatePicker, Radio, Select, Upload, Space, FloatButton, Typography, Row, Col, Divider,
  message, Tooltip, ConfigProvider, Empty, Progress, Grid
} from 'antd';
import idID from 'antd/locale/id_ID';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, SyncOutlined,
  DashboardOutlined, SwapOutlined, MoneyCollectOutlined, ToolOutlined
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

const { Content, Sider } = Layout;
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

// ====================== CUSTOM HOOK: useDebounce ======================
// Hook ini digunakan untuk memberi jeda pada input, agar tidak memicu filter terus-menerus
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


// ====================== SIDE MENU COMPONENT ======================
const menuItems = [
  { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '2', icon: <SwapOutlined />, label: 'Mutasi' },
  { key: '3', icon: <MoneyCollectOutlined />, label: 'Hutang/Piutang' },
  { type: 'divider' },
  { key: '4', icon: <ToolOutlined />, label: 'Generator Data' },
];

const SideMenu = ({ collapsed, onCollapse, onMenuSelect, activeKey }) => {
  return (
    <Sider
      breakpoint="lg" // <-- Tambahan: Sider akan otomatis collapse di layar kecil
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      collapsedWidth={64}
      theme="dark"
    >
      <div
        style={{
          height: 32,
          margin: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <MoneyCollectOutlined style={{ fontSize: '24px', color: 'white' }}/>
        {!collapsed && <Title level={5} style={{ marginBottom: 0, color: 'white' }}>Fgan Finance</Title>}
      </div>
      <Menu
        theme="dark"
        selectedKeys={[activeKey]}
        mode="inline"
        items={menuItems}
        onClick={({ key }) => onMenuSelect(key)}
      />
    </Sider>
  );
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
  const [isFiltering, setIsFiltering] = useState(false); // State baru untuk loading filter
  const [filters, setFilters] = useState({
    dateRange: null,
    selectedTipe: [],
    selectedKategori: [],
    searchText: '',
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaksi, setEditingTransaksi] = useState(null);

  const screens = Grid.useBreakpoint(); // <-- Tambahan: Hook untuk mendeteksi ukuran layar

  // Menggunakan debounce untuk input search
  const debouncedSearchText = useDebounce(filters.searchText, 500);

  // ---- Handlers umum ----
  const handleFilterChange = (key, value) => {
    // Untuk text search, state update-nya ringan dan ditangani oleh debounce.
    if (key === 'searchText') {
      setFilters(prev => ({ ...prev, [key]: value }));
      return;
    }

    // Untuk filter lain yang berat, tampilkan loading dan tunda eksekusi filter
    setIsFiltering(true); 
    setTimeout(() => {
      setFilters(prev => ({ ...prev, [key]: value }));
    }, 0);
  };

  const handleMultiSelectFilter = (key, value) => {
    setIsFiltering(true); // Tampilkan loading saat filter berubah
    setTimeout(() => { // Tunda eksekusi filter agar UI tidak freeze
      setFilters(prev => {
        const currentSelection = prev[key];
        const newSelection = currentSelection.includes(value)
          ? currentSelection.filter(item => item !== value)
          : [...currentSelection, value];
        return { ...prev, [key]: newSelection };
      });
    }, 0);
  };

  const handleTableChange = (paginationConfig) => {
    setPagination(paginationConfig);
  };

  const resetFilters = () => {
    setIsFiltering(true);
    setTimeout(() => { // Tunda eksekusi filter agar UI tidak freeze
      setFilters({
        dateRange: null,
        selectedTipe: [],
        selectedKategori: [],
        searchText: '',
      });
    }, 0);
  };

  // ---- Fetch data Firebase ----
  useEffect(() => {
    const transaksiRef = ref(db, 'transaksi');
    setLoading(true);
    const unsubscribeTransaksi = onValue(transaksiRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTransaksi = [];
      if (data) {
        for (const key in data) {
          loadedTransaksi.push({ id: key, ...data[key] });
        }
      }
      // Pengurutan awal berdasarkan tanggal (descending) untuk tampilan
      loadedTransaksi.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      setTransaksiList(loadedTransaksi);
      setLoading(false);
    });

    return () => {
      unsubscribeTransaksi();
    };
  }, []);
  
  // ---- OPTIMASI: Kalkulasi Saldo Akhir (dijalankan hanya sekali saat data berubah) ----
  const balanceMap = useMemo(() => {
    if (!transaksiList || transaksiList.length === 0) return new Map();

    // Urutkan berdasarkan tanggal (ascending) untuk kalkulasi saldo yang benar
    const sortedAllTx = [...transaksiList].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    const map = new Map();
    let currentBalance = 0;
    for (const tx of sortedAllTx) {
      currentBalance += tx.jumlah;
      map.set(tx.id, currentBalance);
    }
    return map;
  }, [transaksiList]);


  // ---- OPTIMASI: Logika filter yang lebih efisien ----
  const filteredTransaksi = useMemo(() => {
    if (!transaksiList) return [];
    
    const result = transaksiList.filter(tx => {
      const tgl = dayjs(tx.tanggal);
      const [startDate, endDate] = filters.dateRange || [null, null];

      const inDate =
        !startDate ||
        (tgl.isAfter(startDate.startOf('day')) && tgl.isBefore(endDate.endOf('day')));

      const inTipe =
        filters.selectedTipe.length === 0 || filters.selectedTipe.includes(tx.tipe);

      const inKategori =
        filters.selectedKategori.length === 0 || filters.selectedKategori.includes(tx.kategori);
        
      // Menggunakan debouncedSearchText untuk filter
      const inSearch =
        debouncedSearchText === '' ||
        tx.keterangan.toLowerCase().includes(debouncedSearchText.toLowerCase());

      return inDate && inTipe && inKategori && inSearch;
    }).map(tx => ({...tx, saldoSetelah: balanceMap.get(tx.id) })); // Mengambil saldo dari map yang sudah dihitung
    
    return result;

  }, [transaksiList, filters.dateRange, filters.selectedTipe, filters.selectedKategori, debouncedSearchText, balanceMap]);

  // Efek untuk mematikan loading filter setelah selesai
  useEffect(() => {
    if (isFiltering) {
      const timer = setTimeout(() => setIsFiltering(false), 300); // Beri sedikit jeda
      return () => clearTimeout(timer);
    }
  }, [filteredTransaksi, isFiltering]);


  const isFilterActive =
    !!filters.dateRange || filters.selectedTipe.length > 0 || filters.selectedKategori.length > 0 || filters.searchText !== '';

  // ---- CRUD ----
  const handleTambah = () => {
    setEditingTransaksi(null);
    setIsModalOpen(true);
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
  const columns = useMemo(() => {
    
    const localHandleEdit = (record) => {
      setEditingTransaksi(record);
      setIsModalOpen(true);
    };

    const localHandleDelete = (id) => {
      Modal.confirm({
        title: 'Konfirmasi Hapus',
        content: 'Apakah Anda yakin ingin menghapus transaksi ini?',
        okText: 'Hapus',
        okType: 'danger',
        onOk: async () => {
          try {
            await remove(ref(db, `transaksi/${id}`));
            message.success('Transaksi berhasil dihapus');
          } catch (error) {
            console.error("Gagal menghapus:", error);
            message.error('Gagal menghapus transaksi');
          }
        },
      });
    };

    const baseColumns = [
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
              <Button type="link" icon={<EditOutlined />} onClick={() => localHandleEdit(record)} />
            </Tooltip>
            <Tooltip title="Hapus Transaksi">
              <Button type="link" danger icon={<DeleteOutlined />} onClick={() => localHandleDelete(record.id)} />
            </Tooltip>
          </Space>
        ),
        width: 140
      },
    ];

    // Sembunyikan kolom "Saldo Akhir" di layar kecil (di bawah 'md')
    if (!screens.md) {
      return baseColumns.filter(col => col.key !== 'saldoSetelah');
    }
    return baseColumns;

  }, [screens, setEditingTransaksi, setIsModalOpen]);


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
        padding: screens.xs ? '12px' : '24px', // <-- Tambahan: Mengurangi padding di layar hp
        backgroundColor: '#f0f2f5',
        }}
    >
      
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
            loading={loading || isFiltering}
            rowKey="id"
            size="middle"
            scroll={{ x: 'max-content' }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} transaksi`,
            }}
            onChange={handleTableChange}
          />
      </Card>

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


// ====================== PLACEHOLDER PAGES ======================
const DashboardPage = () => (
    <Content style={{ padding: '24px', backgroundColor: '#f0f2f5', maxWidth: 'none' }}>
        <Title level={3}>Dashboard</Title>
        <Paragraph type="secondary">Halaman ini sedang dalam pengembangan.</Paragraph>
    </Content>
);
const HutangPiutangPage = () => (
    <Content style={{ padding: '24px', backgroundColor: '#f0f2f5', maxWidth: 'none' }}>
        <Title level={3}>Hutang/Piutang</Title>
        <Paragraph type="secondary">Halaman ini sedang dalam pengembangan.</Paragraph>
    </Content>
);

// ====================== DATA GENERATOR SCRIPT & PAGE ======================
const random = {
  get: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  getKey: (obj) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
  },
  getDate: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 365);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
};

const generateDummyData = async (db, onProgress) => {
  const transaksiRef = ref(db, 'transaksi');
  const totalData = 10000;
  const batchSize = 500; // Kirim 500 data per batch
  let dataGenerated = 0;

  for (let i = 0; i < totalData / batchSize; i++) {
    const promises = [];
    for (let j = 0; j < batchSize; j++) {
      const tipe = Math.random() > 0.4 ? 'pemasukan' : 'pengeluaran';
      let kategoriKey, kategoriValue;

      if (tipe === 'pemasukan') {
        kategoriKey = random.getKey(KategoriPemasukan);
        kategoriValue = KategoriPemasukan[kategoriKey];
      } else {
        kategoriKey = random.getKey(KategoriPengeluaran);
        kategoriValue = KategoriPengeluaran[kategoriKey];
      }

      let jumlah = random.get(10000, 2000000);
      if (tipe === 'pengeluaran') {
        jumlah = -Math.abs(jumlah);
      }

      const transaksiData = {
        tanggal: random.getDate().getTime(),
        jumlah,
        keterangan: `${kategoriValue} #${random.get(100, 999)}`,
        tipe,
        kategori: kategoriKey,
        buktiUrl: null,
      };
      
      promises.push(push(transaksiRef, transaksiData));
    }

    await Promise.all(promises);
    dataGenerated += batchSize;
    onProgress((dataGenerated / totalData) * 100);
  }
};

const DataGeneratorPage = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    message.loading({ content: 'Memulai proses generator data...', key: 'generator' });
    
    try {
      await generateDummyData(db, (p) => {
        setProgress(p);
      });
      message.success({ content: `SUKSES! 10,000 data berhasil dibuat.`, key: 'generator', duration: 4 });
    } catch (error) {
      console.error("Error generating data:", error);
      message.error({ content: 'Gagal membuat data, lihat konsol untuk detail.', key: 'generator', duration: 4 });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
      <Title level={3}>Generator Data Dummy</Title>
      <Paragraph type="secondary">Gunakan halaman ini untuk mengisi database Anda dengan data transaksi acak untuk keperluan pengujian dan pengembangan.</Paragraph>
      <Card>
        <Row align="middle" gutter={[16, 16]}>
          <Col>
            <Button 
              type="primary" 
              size="large"
              onClick={handleGenerate} 
              loading={isGenerating}
            >
              {isGenerating ? 'Sedang Membuat Data...' : 'Buat 10,000 Data Transaksi'}
            </Button>
          </Col>
          <Col flex="auto">
            {isGenerating && <Progress percent={Math.round(progress)} />}
          </Col>
        </Row>
        <Paragraph style={{ marginTop: '16px' }} type="warning">
          <strong>Perhatian:</strong> Proses ini akan menambahkan 10,000 entri baru ke node `transaksi` di Firebase Realtime Database Anda. Proses ini tidak dapat dibatalkan.
        </Paragraph>
      </Card>
    </Content>
  );
};


// ====================== MAIN APP ======================
const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('2'); // '2' is the key for Mutasi

  const renderPage = () => {
    switch (currentPage) {
      case '1':
        return <DashboardPage />;
      case '2':
        return <MutasiPage />;
      case '3':
        return <HutangPiutangPage />;
      case '4':
        return <DataGeneratorPage />;
      default:
        return <MutasiPage />;
    }
  };

  return (
    <ConfigProvider locale={idID}>
      <Layout style={{ minHeight: '100vh' }}>
        <SideMenu
          collapsed={collapsed}
          onCollapse={setCollapsed}
          onMenuSelect={setCurrentPage}
          activeKey={currentPage}
        />
        <Layout style={{ width: '100%' }}>
          {renderPage()}
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;

