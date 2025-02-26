import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  CircularProgress,
  Paper,
  useTheme,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import HistoryIcon from '@mui/icons-material/History';
import RecommendIcon from '@mui/icons-material/Recommend';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const UploadBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(6),
  textAlign: 'center',
  cursor: 'pointer',
  border: '2px dashed rgba(108, 99, 255, 0.5)',
  backgroundColor: 'rgba(108, 99, 255, 0.05)',
  borderRadius: theme.spacing(2),
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderColor: '#6C63FF',
    transform: 'translateY(-5px)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '200%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
    transition: 'all 0.5s ease',
  },
  '&:hover::before': {
    left: '100%',
  }
}));

const ImageContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '300px',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: theme.spacing(2),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 15px 45px 0 rgba(31, 38, 135, 0.47)',
  }
}));

const StyledImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  transition: 'transform 0.3s ease',
});

const StyledButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #6C63FF 30%, #00D4FF 90%)',
  border: 0,
  borderRadius: '10px',
  boxShadow: '0 3px 5px 2px rgba(108, 99, 255, .3)',
  color: 'white',
  padding: '10px 30px',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 5px 15px rgba(0, 212, 255, 0.4)',
  }
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function ImageSearch() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [similarImages, setSimilarImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchHistory, setSearchHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    fetchUserHistory();
    fetchRecommendations();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? `Bearer ${token}` : '';
  };

  const fetchUserHistory = async () => {
    try {
      const token = getAuthHeader();
      if (!token) return;

      const response = await axios.get('http://localhost:8082/search/history', {
        headers: { Authorization: token }
      });
      if (response.data.success) {
        setSearchHistory(response.data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      if (error.response?.status === 403) {
        // Handle expired token
        localStorage.removeItem('token');
        // You might want to redirect to login here
      }
    }
  };

  const fetchRecommendations = async () => {
    try {
      const token = getAuthHeader();
      if (!token) return;

      const response = await axios.get('http://localhost:8082/search/recommendations', {
        headers: { Authorization: token }
      });
      if (response.data.success) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      if (error.response?.status === 403) {
        localStorage.removeItem('token');
      }
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const token = getAuthHeader();
      // First, get similar images from Python backend
      const pythonResponse = await axios.post('http://127.0.0.1:5000/find-similar', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      if (pythonResponse.data.similar_images) {
        setSimilarImages(pythonResponse.data.similar_images);

        // Then save to Node.js backend if user is authenticated
        if (token) {
          await axios.post('http://localhost:8082/search/save', {
            originalImage: pythonResponse.data.original_image,
            similarImages: pythonResponse.data.similar_images
          }, {
            headers: { 
              'Content-Type': 'application/json',
              Authorization: token 
            }
          });
          
          // Refresh history and recommendations
          await fetchUserHistory();
          await fetchRecommendations();
        }
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 403) {
        setError('Please log in to save your search history');
        localStorage.removeItem('token');
      } else {
        setError(error.response?.data?.message || 'Error processing image');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        my: 6, 
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '2rem',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      }}>
        <Typography 
          variant="h2" 
          gutterBottom
          sx={{
            background: 'linear-gradient(45deg, #6C63FF, #00D4FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            mb: 4
          }}
        >
          Fashion Finder AI 🎭
        </Typography>

        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          centered
          sx={{
            mb: 4,
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: '#00D4FF'
              }
            }
          }}
        >
          <Tab icon={<ImageSearchIcon />} label="SEARCH" />
          <Tab icon={<HistoryIcon />} label="HISTORY" />
          <Tab icon={<RecommendIcon />} label="FOR YOU" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4
            }}
          >
            Upload your fashion inspiration and discover similar styles!
          </Typography>

          <Box sx={{ mt: 4, mb: 2 }}>
            <input
              accept="image/*"
              type="file"
              id="image-upload"
              hidden
              onChange={handleFileSelect}
            />
            <label htmlFor="image-upload">
              <UploadBox>
                <CloudUploadIcon sx={{ fontSize: 64, color: '#6C63FF', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ color: '#6C63FF' }}>
                  Drop your image here
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  or click to browse
                </Typography>
              </UploadBox>
            </label>
          </Box>

          {error && (
            <Typography color="error" sx={{ my: 2 }}>
              {error}
            </Typography>
          )}

          {preview && (
            <Box sx={{ my: 4 }}>
              <ImageContainer>
                <StyledImage src={preview} alt="Preview" />
              </ImageContainer>
              <StyledButton
                variant="contained"
                onClick={handleUpload}
                disabled={loading}
                sx={{ mt: 3 }}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ImageSearchIcon />}
              >
                {loading ? 'Finding Similar Styles...' : 'Find Similar Styles'}
              </StyledButton>
            </Box>
          )}

          {similarImages.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Typography 
                variant="h4" 
                gutterBottom
                sx={{
                  color: '#00D4FF',
                  mb: 4
                }}
              >
                Recommended Styles For You
              </Typography>
              <Grid container spacing={3}>
                {similarImages.map((image, index) => (
                  <Grid item xs={12} sm={6} md={2.4} key={index}>
                    <ImageContainer>
                      <StyledImage
                        src={`data:image/jpeg;base64,${image}`}
                        alt={`Similar style ${index + 1}`}
                      />
                    </ImageContainer>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h4" gutterBottom sx={{ color: '#00D4FF' }}>
            Your Search History
          </Typography>
          {searchHistory.length > 0 ? (
            <Grid container spacing={3}>
              {searchHistory.map((item, index) => (
                <Grid item xs={12} key={index}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                      {new Date(item.timestamp).toLocaleDateString()}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <ImageContainer>
                          <StyledImage
                            src={`data:image/jpeg;base64,${item.originalImage}`}
                            alt="Original"
                          />
                        </ImageContainer>
                      </Grid>
                      <Grid item xs={12} md={9}>
                        <Grid container spacing={2}>
                          {item.similarImages.map((img, idx) => (
                            <Grid item xs={6} sm={4} md={2.4} key={idx}>
                              <ImageContainer>
                                <StyledImage
                                  src={`data:image/jpeg;base64,${img}`}
                                  alt={`Similar ${idx + 1}`}
                                />
                              </ImageContainer>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              No search history yet. Start searching to see your history!
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h4" gutterBottom sx={{ color: '#00D4FF' }}>
            Personalized Recommendations
          </Typography>
          {recommendations.length > 0 ? (
            <Grid container spacing={3}>
              {recommendations.map((image, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <ImageContainer>
                    <StyledImage
                      src={`data:image/jpeg;base64,${image}`}
                      alt={`Recommendation ${index + 1}`}
                    />
                  </ImageContainer>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              No recommendations yet. Start searching to get personalized suggestions!
            </Typography>
          )}
        </TabPanel>

        <Typography 
          variant="body1" 
          sx={{ 
            mt: 6,
            color: 'rgba(255, 255, 255, 0.6)',
            fontStyle: 'italic'
          }}
        >
          Powered by AI & ResNet50 Technology
        </Typography>
      </Box>
    </Container>
  );
}

export default ImageSearch;